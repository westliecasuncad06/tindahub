-- TindaHub: normalized, store-scoped business records. No sample/private data.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check(length(name) between 1 and 120)
);
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 160),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.store_members (
  store_id uuid not null references public.stores(id),
  user_id uuid not null references auth.users(id),
  role text not null check(role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key(store_id,user_id)
);
create index store_members_user_idx on public.store_members(user_id,store_id);
create table public.settings (
  store_id uuid primary key references public.stores(id),
  store_name text not null check(length(store_name) between 1 and 160),
  owner_name text not null default '' check(length(owner_name)<=120),
  address text not null default '' check(length(address)<=255),
  phone text not null default '' check(length(phone)<=30),
  receipt_footer text not null default 'Salamat po! Balik kayo ulit.' check(length(receipt_footer)<=255),
  profit_target numeric(12,2) not null default 1000 check(profit_target>=0)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  name text not null check(length(name) between 1 and 80),
  color text not null default '#ea580c' check(color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order smallint not null default 0 check(sort_order>=0), unique(store_id,id)
);
create unique index categories_name_idx on public.categories(store_id,lower(name));
create table public.products (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  name text not null check(length(name) between 1 and 160), sku text not null default '' check(length(sku)<=40),
  category_id uuid, unit text not null default 'pcs' check(unit in ('pcs','kg','g','L','mL','pack','sachet','bote','kaha')),
  cost_price numeric(12,2) not null default 0 check(cost_price>=0), selling_price numeric(12,2) not null default 0 check(selling_price>=0),
  stock_qty numeric(12,3) not null default 0 check(stock_qty>=0), reorder_level numeric(12,3) not null default 5 check(reorder_level>=0),
  is_active boolean not null default true, expires_on date, created_at timestamptz not null default now(),
  unique(store_id,id), foreign key(store_id,category_id) references public.categories(store_id,id)
);
create unique index products_sku_idx on public.products(store_id,lower(sku)) where sku<>'';
create index products_catalog_idx on public.products(store_id,is_active,category_id);
create index products_name_idx on public.products(store_id,lower(name));
create table public.sales (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  receipt_no text not null, request_id uuid not null, subtotal numeric(12,2) not null check(subtotal>=0),
  discount numeric(12,2) not null default 0 check(discount>=0 and discount<=subtotal),
  total numeric(12,2) not null check(total>=0), cash_received numeric(12,2) not null check(cash_received>=0),
  change_given numeric(12,2) not null check(change_given>=0), cogs_total numeric(12,2) not null check(cogs_total>=0),
  profit_total numeric(12,2) not null, status text not null default 'completed' check(status in ('completed','voided')),
  is_credit boolean not null default false, customer_name text not null default '' check(length(customer_name)<=120),
  note text not null default '' check(length(note)<=255), created_at timestamptz not null default now(),
  unique(store_id,id), unique(store_id,receipt_no), unique(store_id,request_id), check(total=subtotal-discount), check(profit_total=total-cogs_total)
);
create index sales_date_idx on public.sales(store_id,created_at);
create table public.sale_items (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id), sale_id uuid not null, product_id uuid not null,
  product_name text not null, qty numeric(12,3) not null check(qty>0), unit_price numeric(12,2) not null check(unit_price>=0),
  unit_cost numeric(12,2) not null check(unit_cost>=0), line_total numeric(12,2) not null check(line_total>=0),
  foreign key(store_id,sale_id) references public.sales(store_id,id), foreign key(store_id,product_id) references public.products(store_id,id)
);
create index sale_items_sale_idx on public.sale_items(store_id,sale_id);
create index sale_items_product_idx on public.sale_items(store_id,product_id);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id), product_id uuid not null,
  type text not null check(type in ('purchase','sale','adjustment','return','spoilage','count')),
  qty_change numeric(12,3) not null, qty_after numeric(12,3) not null check(qty_after>=0),
  unit_cost numeric(12,2) not null check(unit_cost>=0), reason text not null, ref_sale_id uuid,
  created_at timestamptz not null default now(), foreign key(store_id,product_id) references public.products(store_id,id),
  foreign key(store_id,ref_sale_id) references public.sales(store_id,id)
);
create index stock_movements_product_idx on public.stock_movements(store_id,product_id,created_at);
create index stock_movements_sale_idx on public.stock_movements(store_id,ref_sale_id);
create table public.customer_debts (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  customer_name text not null check(length(customer_name) between 1 and 120), customer_phone text not null default '' check(length(customer_phone)<=30),
  sale_id uuid, total_amount numeric(12,2) not null check(total_amount>0), paid_amount numeric(12,2) not null default 0 check(paid_amount>=0),
  balance numeric(12,2) not null check(balance>=0), status text not null check(status in ('unpaid','partially_paid','paid','voided')),
  due_date date, notes text not null default '' check(length(notes)<=255), created_at timestamptz not null default now(),
  unique(store_id,id), foreign key(store_id,sale_id) references public.sales(store_id,id), check(paid_amount<=total_amount),
  check(status='voided' or balance=total_amount-paid_amount)
);
create index debts_status_idx on public.customer_debts(store_id,status,due_date);
create index debts_sale_idx on public.customer_debts(store_id,sale_id);
create table public.debt_payments (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id), debt_id uuid not null,
  amount numeric(12,2) not null check(amount>0), payment_date date not null, note text not null default '',
  is_downpayment boolean not null default false, created_at timestamptz not null default now(),
  foreign key(store_id,debt_id) references public.customer_debts(store_id,id)
);
create index debt_payments_debt_idx on public.debt_payments(store_id,debt_id);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  category text not null check(length(category) between 1 and 80), description text not null default '' check(length(description)<=255),
  amount numeric(12,2) not null check(amount>0), expense_date date not null, from_drawer boolean not null default false,
  is_deleted boolean not null default false, created_at timestamptz not null default now(), unique(store_id,id)
);
create index expenses_date_idx on public.expenses(store_id,expense_date);
create table public.cash_drawer (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  type text not null check(type in ('opening','sale','payout','deposit','count','reversal')),
  amount numeric(12,2) not null, note text not null, business_date date not null,
  actual_amount numeric(12,2), variance numeric(12,2), ref_sale_id uuid, expense_id uuid, created_at timestamptz not null default now(),
  foreign key(store_id,ref_sale_id) references public.sales(store_id,id), foreign key(store_id,expense_id) references public.expenses(store_id,id),
  check(type<>'count' or (amount=0 and actual_amount>=0))
);
create unique index drawer_opening_idx on public.cash_drawer(store_id,business_date) where type='opening';
create index drawer_date_idx on public.cash_drawer(store_id,business_date);
create index drawer_sale_idx on public.cash_drawer(store_id,ref_sale_id);
create index drawer_expense_idx on public.cash_drawer(store_id,expense_id);
create table private.command_requests (
  store_id uuid not null references public.stores(id), id uuid not null, request jsonb not null, user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(), primary key(store_id,id)
);
alter table private.command_requests enable row level security;

-- Clients may read their rows, but business mutations go through validated transactions.
alter table public.profiles enable row level security;
create policy profile_self on public.profiles for select to authenticated using(id=(select auth.uid()));
alter table public.store_members enable row level security;
create policy membership_self on public.store_members for select to authenticated using(user_id=(select auth.uid()));
do $$ declare t text; begin
  foreach t in array array['stores','settings','categories','products','sales','sale_items','stock_movements','customer_debts','debt_payments','expenses','cash_drawer'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy member_read on public.%I for select to authenticated using (%I in (select store_id from public.store_members where user_id=(select auth.uid())))',t,case when t='stores' then 'id' else 'store_id' end);
  end loop;
end $$;
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.stores, public.store_members, public.settings, public.categories, public.products,
  public.sales,public.sale_items,public.stock_movements,public.customer_debts,public.debt_payments,public.expenses,public.cash_drawer to authenticated;

create function public.app_snapshot(p_store_id uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s uuid; r text; result jsonb; records jsonb; t text; alias text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select store_id,role into s,r from public.store_members where user_id=auth.uid() and (p_store_id is null or store_id=p_store_id) order by created_at,store_id limit 1;
  if s is null then raise exception 'No store membership or access.'; end if;
  select jsonb_build_object('version',2,'store_id',s,'role',r,'user_name',coalesce((select name from public.profiles where id=auth.uid()),'Store team'),'settings',to_jsonb(st)-'store_id','processed_commands','{}'::jsonb,
    'stores',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'role',m.role) order by a.created_at),'[]') from public.stores a join public.store_members m on m.store_id=a.id where m.user_id=auth.uid()))
    into result from public.settings st where st.store_id=s;
  foreach t in array array['categories','products','sales','sale_items','stock_movements','customer_debts','debt_payments','expenses','cash_drawer'] loop
    alias := case t when 'stock_movements' then 'movements' when 'customer_debts' then 'debts' when 'cash_drawer' then 'drawer' else t end;
    execute format('select coalesce(jsonb_agg(to_jsonb(a)-''store_id''%s order by %s),''[]'') from public.%I a where store_id=$1 %s',
      case when t='expenses' then '-''is_deleted''' else '' end,
      case when t='categories' then 'sort_order,name' when t='sale_items' then 'id' else 'created_at,id' end,t,case when t='expenses' then 'and not is_deleted' else '' end)
      into records using s;
    result := jsonb_set(result,array[alias],records);
  end loop;
  return result;
end $$;
revoke all on function public.app_snapshot(uuid) from public, anon;
grant execute on function public.app_snapshot(uuid) to authenticated;
