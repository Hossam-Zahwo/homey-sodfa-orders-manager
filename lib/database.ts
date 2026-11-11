import {neon} from '@neondatabase/serverless';
import type {Order,Customer} from './types';

function sql(){
 const url=process.env.DATABASE_URL;
 if(!url)throw new Error('Neon database is not configured');
 return neon(url);
}
const orderFields:Record<string,string>={enteredAt:'entered_at',createdAt:'created_at',updatedAt:'updated_at',customerName:'customer_name',alternatePhone:'alternate_phone',paymentMethod:'payment_method',assignedTo:'assigned_to',deletedAt:'deleted_at'};
const customerFields:Record<string,string>={alternatePhone:'alternate_phone',createdAt:'created_at',updatedAt:'updated_at',deletedAt:'deleted_at'};
function fromDb<T>(row:Record<string,unknown>,fields:Record<string,string>):T{
 const reverse=Object.fromEntries(Object.entries(fields).map(([a,b])=>[b,a]));
 const obj=Object.fromEntries(Object.entries(row).map(([k,v])=>[reverse[k]||k,v]));
 for(const k of ['prepaid','shipping','discount','version'])if(k in obj)obj[k]=Number(obj[k]??0);
 for(const k of ['enteredAt','createdAt','updatedAt','deletedAt'])if(obj[k] instanceof Date)obj[k]=(obj[k] as Date).toISOString();
 if('deletedAt' in obj && obj.deletedAt==null)obj.deletedAt='';
 return obj as T;
}
const order=(row:Record<string,unknown>)=>fromDb<Order>(row,orderFields);
const customer=(row:Record<string,unknown>)=>fromDb<Customer>(row,customerFields);
const orderDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00+02:00':new Date(v).toISOString();

export async function getOrders():Promise<Order[]>{
 const rows=await sql()`SELECT o.*, COALESCE(a.entered_at, CASE WHEN o.version = 1 THEN o.updated_at END, o.created_at) AS entered_at
  FROM public.orders o
  LEFT JOIN (
   SELECT entity_id, min(created_at) AS entered_at
   FROM public.audit_log WHERE entity = 'order' AND action = 'create'
   GROUP BY entity_id
  ) a ON a.entity_id = o.id::text
  WHERE o.deleted_at IS NULL
  ORDER BY entered_at DESC, o.id DESC LIMIT 5000`;
 return rows.map(order);
}
export async function saveOrder(input:Order):Promise<Order>{
 const db=sql(),date=orderDate(input.createdAt);
 if(input.id){
  const rows=await db`UPDATE public.orders SET
   brand=${input.brand},created_at=${date}::timestamptz,updated_at=now(),
   customer_name=${input.customerName.trim()},phone=${input.phone},alternate_phone=${input.alternatePhone||''},
   governorate=${input.governorate||''},city=${input.city||''},address=${input.address||''},
   source=${input.source||''},payment_method=${input.paymentMethod||''},
   prepaid=${input.prepaid},shipping=${input.shipping},discount=${input.discount},
   items=${JSON.stringify(input.items)}::jsonb,status=${input.status},
   notes=${input.notes||''},assigned_to=${input.assignedTo||''},version=version+1
   WHERE id=${input.id}::uuid AND version=${input.version} AND deleted_at IS NULL RETURNING *`;
  if(!rows.length)throw new Error('CONFLICT');
  return order(rows[0]);
 }
 const rows=await db`INSERT INTO public.orders
  (brand,created_at,customer_name,phone,alternate_phone,governorate,city,address,source,payment_method,
   prepaid,shipping,discount,items,status,notes,assigned_to)
  VALUES (${input.brand},${date}::timestamptz,${input.customerName.trim()},${input.phone},${input.alternatePhone||''},
  ${input.governorate||''},${input.city||''},${input.address||''},${input.source||''},${input.paymentMethod||''},
  ${input.prepaid},${input.shipping},${input.discount},${JSON.stringify(input.items)}::jsonb,${input.status},
  ${input.notes||''},${input.assignedTo||''}) RETURNING *`;
 return order(rows[0]);
}
export async function removeOrder(id:string,version:number):Promise<Order>{
 const rows=await sql()`UPDATE public.orders SET deleted_at=now(),updated_at=now(),version=version+1
  WHERE id=${id}::uuid AND version=${version} AND deleted_at IS NULL RETURNING *`;
 if(!rows.length)throw new Error('CONFLICT');
 return order(rows[0]);
}
export async function getCustomers():Promise<Customer[]>{
 const rows=await sql()`SELECT * FROM public.customers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5000`;
 return rows.map(customer);
}
export async function saveCustomer(input:Customer):Promise<Customer>{
 const db=sql();
 if(input.id){
  const rows=await db`UPDATE public.customers SET brand=${input.brand},name=${input.name.trim()},
   phone=${input.phone},alternate_phone=${input.alternatePhone||''},governorate=${input.governorate||''},
   city=${input.city||''},address=${input.address||''},notes=${input.notes||''},updated_at=now()
   WHERE id=${input.id}::uuid AND deleted_at IS NULL RETURNING *`;
  if(!rows.length)throw new Error('NOT_FOUND');
  return customer(rows[0]);
 }
 const rows=await db`INSERT INTO public.customers(brand,name,phone,alternate_phone,governorate,city,address,notes)
 VALUES (${input.brand},${input.name.trim()},${input.phone},${input.alternatePhone||''},${input.governorate||''},
 ${input.city||''},${input.address||''},${input.notes||''}) RETURNING *`;
 return customer(rows[0]);
}
export async function removeCustomer(id:string){
 const rows=await sql()`UPDATE public.customers SET deleted_at=now(),updated_at=now()
 WHERE id=${id}::uuid AND deleted_at IS NULL RETURNING id`;
 if(!rows.length)throw new Error('NOT_FOUND');
}
export async function audit(action:string,entity:string,entityId:string,brand:string,details:string,actor='authorized-user'){
 await sql()`INSERT INTO public.audit_log(actor,action,entity,entity_id,brand,details)
 VALUES (${actor},${action},${entity},${entityId},${brand},${details})`;
}

export async function getPrintHistory(){
 const rows=await sql()`SELECT DISTINCT entity_id FROM public.audit_log WHERE action='print' AND entity='print_document'`;
 return rows.map(row=>String(row.entity_id));
}

export async function recordPrintHistory(keys:string[]){
 await sql()`INSERT INTO public.audit_log(actor,action,entity,entity_id,brand,details)
  SELECT 'authorized-user','print','print_document',key,'', ''
  FROM unnest(${keys}::text[]) AS documents(key)
  WHERE NOT EXISTS (
   SELECT 1 FROM public.audit_log
   WHERE action='print' AND entity='print_document' AND entity_id=key
  )`;
}
