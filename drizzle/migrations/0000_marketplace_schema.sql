
create type public.app_role as enum ('admin','artisan','customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  bio text,
  location text,
  phone text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin profile update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- prevent non-admins from changing suspension flag
create or replace function public.guard_profile_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_suspended <> old.is_suspended and not public.has_role(auth.uid(),'admin') then
    new.is_suspended := old.is_suspended;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r text;
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  r := coalesce(new.raw_user_meta_data->>'role','customer');
  if r not in ('artisan','customer') then r := 'customer'; end if;
  insert into public.user_roles(user_id, role) values (new.id, r::app_role);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid,
  artisan_name text not null default 'WeaveHeritage Collective',
  artisan_location text,
  name text not null,
  description text not null default '',
  category text not null check (category in ('Traditional Sarees','Wooden Crafts','Pottery','Paintings','Jewellery','Lamps','Bamboo Crafts')),
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public active products" on public.products for select using (is_active or artisan_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "artisan insert" on public.products for insert to authenticated with check (artisan_id = auth.uid() and public.has_role(auth.uid(),'artisan'));
create policy "artisan update" on public.products for update to authenticated using (artisan_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "artisan delete" on public.products for delete to authenticated using (artisan_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.fill_artisan_info() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.artisan_id is not null then
    select full_name, location into new.artisan_name, new.artisan_location from public.profiles where id = new.artisan_id;
    new.artisan_name := coalesce(nullif(new.artisan_name,''),'Artisan');
  end if;
  return new;
end $$;
create trigger products_artisan before insert on public.products for each row execute function public.fill_artisan_info();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "own cart" on public.cart_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.product_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
grant select, insert on public.product_views to authenticated;
grant all on public.product_views to service_role;
alter table public.product_views enable row level security;
create policy "own views" on public.product_views for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  total numeric(10,2) not null,
  shipping_name text not null,
  shipping_address text not null,
  shipping_phone text not null,
  payment_method text not null default 'Cash on Delivery',
  created_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  artisan_id uuid,
  product_name text not null,
  image_url text,
  price numeric(10,2) not null,
  quantity integer not null,
  status text not null default 'Pending' check (status in ('Pending','Processing','Shipped','Delivered','Cancelled')),
  created_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
grant select on public.order_items to authenticated;
grant update (status) on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "orders read" on public.orders for select to authenticated using (
  customer_id = auth.uid() or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.order_items oi where oi.order_id = id and oi.artisan_id = auth.uid()));
create policy "items read" on public.order_items for select to authenticated using (
  artisan_id = auth.uid() or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "items status" on public.order_items for update to authenticated using (artisan_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.place_order(_items jsonb, _name text, _address text, _phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); oid uuid; it jsonb; p public.products; q int; tot numeric := 0;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  if exists (select 1 from profiles where id = uid and is_suspended) then raise exception 'Account suspended'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Cart is empty'; end if;
  if coalesce(trim(_name),'') = '' or coalesce(trim(_address),'') = '' or coalesce(trim(_phone),'') = '' then raise exception 'Shipping details required'; end if;
  insert into orders(customer_id,total,shipping_name,shipping_address,shipping_phone) values (uid,0,_name,_address,_phone) returning id into oid;
  for it in select * from jsonb_array_elements(_items) loop
    q := (it->>'quantity')::int;
    if q is null or q < 1 then raise exception 'Invalid quantity'; end if;
    select * into p from products where id = (it->>'product_id')::uuid and is_active for update;
    if not found then raise exception 'Product unavailable'; end if;
    if p.stock < q then raise exception 'Only % left of %', p.stock, p.name; end if;
    update products set stock = stock - q where id = p.id;
    insert into order_items(order_id,product_id,artisan_id,product_name,image_url,price,quantity) values (oid,p.id,p.artisan_id,p.name,p.image_url,p.price,q);
    tot := tot + p.price * q;
  end loop;
  update orders set total = tot where id = oid;
  delete from cart_items where user_id = uid and product_id in (select (e->>'product_id')::uuid from jsonb_array_elements(_items) e);
  return oid;
end $$;
grant execute on function public.place_order(jsonb,text,text,text) to authenticated;

create or replace function public.admin_list_users()
returns table(id uuid, email text, full_name text, roles text[], is_suspended boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  return query select p.id, u.email::text, p.full_name, array(select r.role::text from user_roles r where r.user_id = p.id), p.is_suspended, p.created_at
    from profiles p join auth.users u on u.id = p.id order by p.created_at desc;
end $$;
grant execute on function public.admin_list_users() to authenticated;

insert into public.products(name, category, price, stock, image_url, artisan_name, artisan_location, description) values
('Kanjivaram Silk Saree – Temple Border','Traditional Sarees',18500,6,'/images/saree-kanjivaram.jpg','Meenakshi Weavers','Kanchipuram, Tamil Nadu','Handwoven pure mulberry silk in deep maroon with a contrasting gold zari temple border. Woven over 12 days on a traditional pit loom.'),
('Banarasi Brocade Saree','Traditional Sarees',14200,4,'/images/saree-banarasi.jpg','Ansari Handlooms','Varanasi, Uttar Pradesh','Rich emerald silk with intricate floral brocade butis and a heavy pallu, a heirloom piece for weddings and festivals.'),
('Channapatna Wooden Toy Set','Wooden Crafts',1250,20,'/images/wood-channapatna.jpg','Channapatna Toy Guild','Channapatna, Karnataka','Lacquer-finished ivory wood toys coloured with natural vegetable dyes. Safe, smooth and joyfully bright.'),
('Hand-carved Sheesham Elephant','Wooden Crafts',3400,10,'/images/wood-elephant.jpg','Saharanpur Carvers','Saharanpur, Uttar Pradesh','Solid sheesham wood elephant with fine hand-carved trappings, polished to a warm natural sheen.'),
('Blue Pottery Vase','Pottery',2100,12,'/images/pottery-blue.jpg','Jaipur Blue Studio','Jaipur, Rajasthan','Quartz-based Jaipur blue pottery with hand-painted cobalt and turquoise florals. Lead-free glaze.'),
('Terracotta Kulhad Set of 6','Pottery',650,30,'/images/pottery-kulhad.jpg','Kumhar Collective','Khurja, Uttar Pradesh','Wheel-thrown earthen cups for chai and lassi, sun-dried and kiln-fired for an earthy aroma.'),
('Madhubani Painting – Tree of Life','Paintings',4800,5,'/images/painting-madhubani.jpg','Sita Devi Arts','Madhubani, Bihar','Hand-painted on handmade paper with natural pigments and nib, depicting the sacred tree of life with birds and fish.'),
('Pattachitra Scroll – Krishna Leela','Paintings',6200,3,'/images/painting-pattachitra.jpg','Raghurajpur Chitrakars','Raghurajpur, Odisha','Traditional cloth-based scroll painting with mineral colours narrating episodes of Krishna Leela.'),
('Oxidised Silver Jhumka Earrings','Jewellery',890,25,'/images/jewel-jhumka.jpg','Kutch Silversmiths','Bhuj, Gujarat','Lightweight oxidised German silver jhumkas with dangling beads and intricate filigree.'),
('Dokra Brass Tribal Necklace','Jewellery',2450,8,'/images/jewel-dokra.jpg','Bastar Dokra Artisans','Bastar, Chhattisgarh','Lost-wax cast brass pendant necklace, an ancient 4000-year-old metal craft of tribal artisans.'),
('Brass Diya – Peacock','Lamps',1650,15,'/images/lamp-diya.jpg','Moradabad Brassworks','Moradabad, Uttar Pradesh','Hand-cast brass oil lamp crowned with a peacock, perfect for pooja and festive décor.'),
('Moroccan-Indian Mosaic Lantern','Lamps',2800,9,'/images/lamp-lantern.jpg','Khurja Light Crafts','Khurja, Uttar Pradesh','Hand-assembled glass mosaic hanging lamp that casts warm, jewel-toned patterns.'),
('Bamboo Weave Basket Set','Bamboo Crafts',980,18,'/images/bamboo-basket.jpg','Assam Cane & Bamboo','Majuli, Assam','Set of three hand-woven bamboo baskets for storage, fruits and gifting. Eco-friendly and durable.'),
('Bamboo Pendant Lamp Shade','Bamboo Crafts',1900,7,'/images/bamboo-lamp.jpg','Tripura Bamboo Co-op','Agartala, Tripura','Finely woven bamboo pendant shade that diffuses soft, natural light. Hardware included.');
