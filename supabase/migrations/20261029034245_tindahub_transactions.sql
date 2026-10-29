-- All privileged code is private, validates auth.uid(), and has a fixed search path.
create function private.n(p jsonb,k text,places integer,d numeric default null) returns numeric
language plpgsql immutable set search_path='' as $$
declare v numeric;
begin
  if not p?k then
    if d is null then raise exception '% is required.',k; end if;
    return d;
  end if;
  if jsonb_typeof(p->k)<>'number' or p->k='null'::jsonb then raise exception '% must be a number.',k; end if;
  v:=(p->>k)::numeric;
  if v<0 or v<>trunc(v,places) or v>power(10::numeric,12-places)-power(10::numeric,-places) then raise exception '% has invalid precision or exceeds the limit.',k; end if;
  return v;
end $$;
create function private.t(p jsonb,k text,maxlen integer default 255,required boolean default false) returns text
language plpgsql immutable set search_path='' as $$
declare v text;
begin
  if p?k and jsonb_typeof(p->k) not in ('string','null') then raise exception '% must be text.',k; end if;
  v:=btrim(coalesce(p->>k,''));
  if length(v)>maxlen or (required and v='') then raise exception '% is required and must fit the length limit.',k; end if;
  return v;
end $$;
create function private.b(p jsonb,k text,d boolean default false) returns boolean
language plpgsql immutable set search_path='' as $$
begin
  if not p?k then return d; end if;
  if jsonb_typeof(p->k)<>'boolean' then raise exception '% must be boolean.',k; end if;
  return (p->>k)::boolean;
end $$;
create function private.movement(s uuid,pid uuid,q numeric,kind text,why text,cost numeric,sale uuid default null) returns void
language plpgsql set search_path='' as $$
declare after_qty numeric;
begin
  update public.products set stock_qty=stock_qty+q where store_id=s and id=pid and stock_qty+q>=0 returning stock_qty into after_qty;
  if not found then raise exception 'Product missing or insufficient stock.'; end if;
  insert into public.stock_movements(store_id,product_id,type,qty_change,qty_after,unit_cost,reason,ref_sale_id) values(s,pid,kind,q,after_qty,cost,why,sale);
end $$;
create function private.cash(s uuid,kind text,q numeric,why text,sale uuid default null,expense uuid default null,actual numeric default null) returns void
language plpgsql set search_path='' as $$
declare bal numeric; variance numeric; day date := (now() at time zone 'Asia/Manila')::date;
begin
  select coalesce(sum(amount),0) into bal from public.cash_drawer where store_id=s and business_date=day and type<>'count';
  if abs(bal+q)>9999999999.99 then raise exception 'Drawer amount exceeds the limit.'; end if;
  if kind='count' then variance:=actual-bal; end if;
  insert into public.cash_drawer(store_id,type,amount,note,business_date,ref_sale_id,expense_id,actual_amount,variance) values(s,kind,q,why,day,sale,expense,actual,variance);
end $$;
create function private.debt(s uuid,p jsonb,sale uuid default null,record_cash boolean default true) returns uuid
language plpgsql set search_path='' as $$
declare d uuid; total numeric:=private.n(p,'total_amount',2); paid numeric:=private.n(p,'downpayment',2,0); day date:=(now() at time zone 'Asia/Manila')::date;
begin
  if total<=0 or paid>total then raise exception 'Invalid debt amount or downpayment.'; end if;
  insert into public.customer_debts(store_id,customer_name,customer_phone,sale_id,total_amount,paid_amount,balance,status,due_date,notes)
    values(s,private.t(p,'customer_name',120,true),private.t(p,'customer_phone',30),sale,total,paid,total-paid,
      case when paid=total then 'paid' when paid>0 then 'partially_paid' else 'unpaid' end,nullif(p->>'due_date','')::date,private.t(p,'notes')) returning id into d;
  if paid>0 then
    insert into public.debt_payments(store_id,debt_id,amount,payment_date,note,is_downpayment) values(s,d,paid,day,'Downpayment',true);
    if record_cash then perform private.cash(s,'deposit',paid,'Debt downpayment'); end if;
  end if;
  return d;
end $$;

create function private.create_store(store_name text,owner_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s uuid; u uuid:=auth.uid();
begin
  if u is null then raise exception 'Authentication required.'; end if;
  if length(btrim(store_name)) not between 1 and 160 or length(btrim(owner_name)) not between 1 and 120 then raise exception 'Store and owner names are required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  -- Retried onboarding must not create duplicate stores.
  select store_id into s from public.store_members where user_id=u and role='owner' order by created_at limit 1;
  if s is not null then return public.app_snapshot(s); end if;
  insert into public.profiles(id,name) values(u,btrim(owner_name)) on conflict(id) do update set name=excluded.name;
  insert into public.stores(name,created_by) values(btrim(store_name),u) returning id into s;
  insert into public.store_members values(s,u,'owner',now());
  insert into public.settings(store_id,store_name,owner_name) values(s,btrim(store_name),btrim(owner_name));
  insert into public.categories(store_id,name,color,sort_order) values(s,'Food & snacks','#ea580c',0),(s,'Drinks','#0284c7',1),(s,'Home essentials','#16a34a',2);
  return public.app_snapshot(s);
end $$;
create function public.create_store(store_name text,owner_name text) returns jsonb
language sql security invoker set search_path='' as $$select private.create_store(store_name,owner_name)$$;

create function private.add_staff(s uuid,email text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  perform 1 from public.stores where id=s for update;
  if not exists(select 1 from public.store_members where store_id=s and user_id=auth.uid() and role='owner') then raise exception 'Only the owner can add staff.'; end if;
  select id into u from auth.users where lower(auth.users.email)=lower(btrim(add_staff.email)) and email_confirmed_at is not null;
  if u is null then raise exception 'Ask this staff member to register and verify their email first.'; end if;
  insert into public.store_members(store_id,user_id,role) values(s,u,'staff') on conflict do nothing;
end $$;
create function public.add_staff(p_store_id uuid,p_email text) returns void
language sql security invoker set search_path='' as $$select private.add_staff(p_store_id,p_email)$$;

create function private.command(s uuid,c jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  role_name text; kind text:=c->>'type'; p jsonb:=c->'payload'; request_id uuid:=(c->>'id')::uuid; prior jsonb;
  prod public.products; sale public.sales; debt public.customer_debts; expense public.expenses; item record;
  pid uuid; sid uuid; q numeric; price numeric; total numeric:=0; subtotal numeric:=0; cost numeric:=0;
  discount numeric; paid numeric; credit boolean; seq integer; receipt text; reason text; v jsonb;
  day date:=(now() at time zone 'Asia/Manila')::date;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if request_id is null or jsonb_typeof(p) is distinct from 'object' then raise exception 'Invalid request.'; end if;
  -- A row lock serializes one store's checkout, receipt, inventory and cash changes.
  perform 1 from public.stores where id=s for update;
  select role into role_name from public.store_members where store_id=s and user_id=auth.uid();
  if role_name is null then raise exception 'No store membership or access.'; end if;
  if kind not in ('sale.checkout','debt.create','debt.pay','expense.save','drawer.record') and role_name<>'owner' then raise exception 'Only the store owner can perform this action.'; end if;
  select request into prior from private.command_requests where store_id=s and id=request_id;
  if found then
    if prior<>c then raise exception 'Request ID already used for a different request.'; end if;
    return public.app_snapshot(s);
  end if;
  if kind='category.save' then
    if p?'id' then
      update public.categories set name=private.t(p,'name',80,true),color=coalesce(p->>'color',color),sort_order=coalesce((p->>'sort_order')::smallint,sort_order) where store_id=s and id=(p->>'id')::uuid;
      if not found then raise exception 'Category missing.'; end if;
    else insert into public.categories(store_id,name,color,sort_order) values(s,private.t(p,'name',80,true),coalesce(p->>'color','#ea580c'),coalesce((p->>'sort_order')::smallint,0)); end if;
  elsif kind='product.save' then
    if p?'id' then
      select * into prod from public.products where store_id=s and id=(p->>'id')::uuid;
      if not found then raise exception 'Product missing.'; end if;
      if p?'stock_qty' and private.n(p,'stock_qty',3)<>prod.stock_qty then raise exception 'Change stock through an adjustment.'; end if;
      v:=(to_jsonb(prod)-'store_id')||p;
      update public.products set name=private.t(v,'name',160,true),sku=private.t(v,'sku',40),category_id=nullif(v->>'category_id','')::uuid,
        unit=coalesce(v->>'unit','pcs'),cost_price=private.n(v,'cost_price',2),selling_price=private.n(v,'selling_price',2),
        reorder_level=private.n(v,'reorder_level',3),is_active=private.b(v,'is_active',true),expires_on=nullif(v->>'expires_on','')::date where id=prod.id;
    else
      q:=private.n(p,'stock_qty',3,0);
      insert into public.products(store_id,name,sku,category_id,unit,cost_price,selling_price,reorder_level,is_active,expires_on)
        values(s,private.t(p,'name',160,true),private.t(p,'sku',40),nullif(p->>'category_id','')::uuid,coalesce(p->>'unit','pcs'),private.n(p,'cost_price',2,0),private.n(p,'selling_price',2,0),private.n(p,'reorder_level',3,5),private.b(p,'is_active',true),nullif(p->>'expires_on','')::date) returning * into prod;
      if q>0 then perform private.movement(s,prod.id,q,'purchase','Opening stock',prod.cost_price); end if;
    end if;
  elsif kind='product.archive' then
    update public.products set is_active=false where store_id=s and id=(p->>'product_id')::uuid;
    if not found then raise exception 'Product missing.'; end if;
  elsif kind='stock.adjust' then
    select * into prod from public.products where store_id=s and id=(p->>'product_id')::uuid;
    if not found then raise exception 'Product missing.'; end if;
    q:=private.n(p,'qty',3); price:=private.n(p,'unit_cost',2,prod.cost_price); reason:=private.t(p,'reason',255,true);
    if q<=0 or coalesce(p->>'direction','') not in ('add','remove') then raise exception 'Invalid stock quantity or direction.'; end if;
    perform private.movement(s,prod.id,case when p->>'direction'='add' then q else -q end,case when p->>'direction'='add' then 'purchase' else 'spoilage' end,reason,price);
    if private.b(p,'update_cost_price') then
      if p->>'direction'<>'add' then raise exception 'Only a delivery can update cost.'; end if;
      update public.products set cost_price=price where id=prod.id;
    end if;
  elsif kind='count.submit' then
    if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') not between 1 and 1000 then raise exception 'Count items are required.'; end if;
    if (select count(*)<>count(distinct x->>'product_id') from jsonb_array_elements(p->'items') x) then raise exception 'Duplicate count product.'; end if;
    for v in select value from jsonb_array_elements(p->'items') loop
      select * into prod from public.products where store_id=s and id=(v->>'product_id')::uuid;
      if not found then raise exception 'Product missing.'; end if;
      if v?'expected_stock_qty' and private.n(v,'expected_stock_qty',3)<>prod.stock_qty then raise exception 'Stock changed while counting. Refresh and observe this product again.'; end if;
      perform private.movement(s,prod.id,private.n(v,'counted_qty',3)-prod.stock_qty,'count',coalesce(nullif(private.t(p,'reason'),''),'Physical count'),prod.cost_price);
    end loop;
  elsif kind='sale.checkout' then
    if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') not between 1 and 1000 then raise exception 'Cart is empty.'; end if;
    for v in select value from jsonb_array_elements(p->'items') loop if private.n(v,'qty',3)<=0 then raise exception 'Quantity must be positive.'; end if; end loop;
    -- Stable ordering also makes future finer-grained locking safe.
    for item in select (x->>'product_id')::uuid id,sum((x->>'qty')::numeric) qty from jsonb_array_elements(p->'items') x group by 1 order by 1 loop
      select * into prod from public.products where store_id=s and id=item.id and is_active for update;
      if not found then raise exception 'Product unavailable.'; end if;
      if item.qty>prod.stock_qty then raise exception 'Insufficient stock for %.',prod.name; end if;
      subtotal:=subtotal+round(prod.selling_price*item.qty,2); cost:=cost+round(prod.cost_price*item.qty,2);
    end loop;
    discount:=private.n(p,'discount',2,0); total:=subtotal-discount; credit:=private.b(p,'is_credit');
    paid:=case when credit then private.n(p,'downpayment',2,0) else private.n(p,'cash',2) end;
    if total<0 then raise exception 'Discount exceeds the subtotal.'; end if;
    if (credit and paid>total) or (not credit and paid<total) then raise exception 'Invalid payment or downpayment.'; end if;
    if credit then perform private.t(p,'customer_name',120,true); end if;
    select coalesce(max(substring(receipt_no from 10)::integer),0)+1 into seq from public.sales where store_id=s and receipt_no like to_char(day,'YYYYMMDD')||'-%';
    receipt:=to_char(day,'YYYYMMDD')||'-'||lpad(seq::text,greatest(4,length(seq::text)),'0');
    insert into public.sales(store_id,receipt_no,request_id,subtotal,discount,total,cash_received,change_given,cogs_total,profit_total,is_credit,customer_name,note)
      values(s,receipt,request_id,subtotal,discount,total,paid,case when credit then 0 else paid-total end,cost,total-cost,credit,private.t(p,'customer_name',120),private.t(p,'note')) returning id into sid;
    for item in select (x->>'product_id')::uuid id,sum((x->>'qty')::numeric) qty from jsonb_array_elements(p->'items') x group by 1 order by 1 loop
      select * into prod from public.products where store_id=s and id=item.id;
      insert into public.sale_items(store_id,sale_id,product_id,product_name,qty,unit_price,unit_cost,line_total) values(s,sid,prod.id,prod.name,item.qty,prod.selling_price,prod.cost_price,round(prod.selling_price*item.qty,2));
      perform private.movement(s,prod.id,-item.qty,'sale','Sale',prod.cost_price,sid);
    end loop;
    q:=case when credit then paid else total end;
    if q>0 then perform private.cash(s,'sale',q,'Sale payment',sid); end if;
    if credit and total>0 then perform private.debt(s,p||jsonb_build_object('total_amount',total),sid,false); end if;
  elsif kind='sale.void' then
    select * into sale from public.sales where store_id=s and id=(p->>'sale_id')::uuid;
    if not found or sale.status='voided' then raise exception 'Sale missing or already voided.'; end if;
    reason:=private.t(p,'reason',255,true);
    select * into debt from public.customer_debts where store_id=s and sale_id=sale.id;
    if found then
      if exists(select 1 from public.debt_payments where store_id=s and debt_id=debt.id and not is_downpayment) then raise exception 'Reconcile later repayments before voiding.'; end if;
      update public.customer_debts set status='voided',balance=0 where id=debt.id;
    end if;
    for item in select * from public.sale_items where store_id=s and sale_id=sale.id loop perform private.movement(s,item.product_id,item.qty,'return',reason,item.unit_cost,sale.id); end loop;
    q:=case when sale.is_credit then sale.cash_received else sale.total end;
    if q>0 then perform private.cash(s,'reversal',-q,reason,sale.id); end if;
    update public.sales set status='voided' where id=sale.id;
  elsif kind='debt.create' then perform private.debt(s,p);
  elsif kind='debt.pay' then
    select * into debt from public.customer_debts where store_id=s and id=(p->>'debt_id')::uuid;
    if not found or debt.status='voided' then raise exception 'Debt missing or voided.'; end if;
    q:=private.n(p,'amount',2);
    if q<=0 or q>debt.balance then raise exception 'Payment exceeds the outstanding balance.'; end if;
    update public.customer_debts set paid_amount=paid_amount+q,balance=balance-q,status=case when balance=q then 'paid' else 'partially_paid' end where id=debt.id;
    insert into public.debt_payments(store_id,debt_id,amount,payment_date,note) values(s,debt.id,q,coalesce(nullif(p->>'payment_date','')::date,day),private.t(p,'note'));
    perform private.cash(s,'deposit',q,'Debt payment');
  elsif kind='expense.save' then
    q:=private.n(p,'amount',2); if q<=0 then raise exception 'Expense amount must be positive.'; end if;
    insert into public.expenses(store_id,category,description,amount,expense_date,from_drawer) values(s,private.t(p,'category',80,true),private.t(p,'description'),q,coalesce(nullif(p->>'expense_date','')::date,day),private.b(p,'from_drawer')) returning * into expense;
    if expense.from_drawer then perform private.cash(s,'payout',-q,'Expense: '||expense.category,null,expense.id); end if;
  elsif kind='expense.delete' then
    select * into expense from public.expenses where store_id=s and id=(p->>'expense_id')::uuid and not is_deleted;
    if not found then raise exception 'Expense missing.'; end if;
    if expense.from_drawer then perform private.cash(s,'reversal',expense.amount,'Expense refund',null,expense.id); end if;
    update public.expenses set is_deleted=true where id=expense.id;
  elsif kind='drawer.record' then
    reason:=coalesce(nullif(private.t(p,'note'),''),'Cash drawer '||(p->>'type')); q:=private.n(p,'amount',2);
    if coalesce(p->>'type','') not in ('opening','deposit','payout','count') or ((p->>'type') in ('deposit','payout') and q<=0) then raise exception 'Invalid drawer type or amount.'; end if;
    perform private.cash(s,p->>'type',case when p->>'type'='count' then 0 when p->>'type'='payout' then -q else q end,reason,null,null,case when p->>'type'='count' then q else null end);
  elsif kind='settings.update' then
    select (to_jsonb(st)-'store_id')||p into v from public.settings st where store_id=s;
    update public.settings set store_name=private.t(v,'store_name',160,true),owner_name=private.t(v,'owner_name',120),address=private.t(v,'address'),phone=private.t(v,'phone',30),receipt_footer=private.t(v,'receipt_footer'),profit_target=private.n(v,'profit_target',2) where store_id=s;
    update public.stores set name=private.t(v,'store_name',160,true) where id=s;
  elsif kind='stock.repair' then
    reason:=private.t(p,'reason',255,true);
    for item in select a.id,a.stock_qty,a.cost_price,a.stock_qty-coalesce(sum(m.qty_change),0) diff from public.products a left join public.stock_movements m on m.store_id=a.store_id and m.product_id=a.id where a.store_id=s and (not p?'product_id' or a.id=(p->>'product_id')::uuid) group by a.id having a.stock_qty<>coalesce(sum(m.qty_change),0) loop
      insert into public.stock_movements(store_id,product_id,type,qty_change,qty_after,unit_cost,reason) values(s,item.id,'adjustment',item.diff,item.stock_qty,item.cost_price,'Ledger repair: '||reason);
    end loop;
  else raise exception 'Unknown command type.';
  end if;
  insert into private.command_requests(store_id,id,request,user_id) values(s,request_id,c,auth.uid());
  return public.app_snapshot(s);
end $$;
create function public.app_command(p_store_id uuid,command jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private.command(p_store_id,command)$$;

-- Helpers are not an API. Only guarded entrypoints are executable by authenticated users.
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.command(uuid,jsonb),private.create_store(text,text),private.add_staff(uuid,text) to authenticated;
revoke all on function public.app_command(uuid,jsonb),public.create_store(text,text),public.add_staff(uuid,text) from public,anon;
grant execute on function public.app_command(uuid,jsonb),public.create_store(text,text),public.add_staff(uuid,text) to authenticated;
