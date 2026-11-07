import type {Order,Customer} from './types';
const ordersFields:{[k:string]:string}={createdAt:'created_at',updatedAt:'updated_at',customerName:'customer_name',alternatePhone:'alternate_phone',paymentMethod:'payment_method',assignedTo:'assigned_to',deletedAt:'deleted_at'};
const customerFields:{[k:string]:string}={alternatePhone:'alternate_phone',createdAt:'created_at',updatedAt:'updated_at',deletedAt:'deleted_at'};
function toDb(v:Record<string,unknown>,mapping:Record<string,string>){return Object.fromEntries(Object.entries(v).map(([k,value])=>[mapping[k]||k,value]));}
function fromDb<T>(v:Record<string,unknown>,mapping:Record<string,string>):T{const inverse=Object.fromEntries(Object.entries(mapping).map(([k,value])=>[value,k]));const out=Object.fromEntries(Object.entries(v).map(([k,value])=>[inverse[k]||k,value]));for(const key of ['prepaid','shipping','discount','version'])if(key in out)out[key]=Number(out[key]||0);return out as T}
async function db(table:string,method='GET',filter='',payload?:Record<string,unknown>,extra:Record<string,string>={}):Promise<any>{
 const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)throw new Error('Supabase database is not configured');
 const response=await fetch(url+'/rest/v1/'+table+(filter?'?'+filter:''),{method,headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json',Prefer:'return=representation',...extra},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
 if(!response.ok){const body=await response.text();throw new Error('Database error '+response.status+': '+body.slice(0,160))}
 return response.status===204?[]:response.json();
}
export async function getOrders():Promise<Order[]>{return (await db('orders','GET','select=*&deleted_at=is.null&order=created_at.desc')).map((x:Record<string,unknown>)=>fromDb<Order>(x,ordersFields))}
export async function saveOrder(input:Order):Promise<Order>{
 const now=new Date().toISOString();
 if(input.id){
  const patch=toDb({...input,version:input.version+1,updatedAt:now},ordersFields);delete patch.id;delete patch.created_at;
  const rows=await db('orders','PATCH','id=eq.'+encodeURIComponent(input.id)+'&version=eq.'+input.version+'&deleted_at=is.null',patch);
  if(!rows.length)throw new Error('CONFLICT');
  return fromDb<Order>(rows[0],ordersFields);
 }
 const date=/^\d{4}-\d{2}-\d{2}$/.test(input.createdAt)?input.createdAt:now;
 const record=toDb({...input,createdAt:date,updatedAt:now,version:1},ordersFields);delete record.id;delete record.deleted_at;
 const rows=await db('orders','POST','',record);return fromDb<Order>(rows[0],ordersFields);
}
export async function removeOrder(id:string,version:number):Promise<Order>{
 const rows=await db('orders','PATCH','id=eq.'+encodeURIComponent(id)+'&version=eq.'+version+'&deleted_at=is.null',{deleted_at:new Date().toISOString(),version:version+1});
 if(!rows.length)throw new Error('CONFLICT');return fromDb<Order>(rows[0],ordersFields);
}
export async function getCustomers():Promise<Customer[]>{return (await db('customers','GET','select=*&deleted_at=is.null&order=created_at.desc')).map((x:Record<string,unknown>)=>fromDb<Customer>(x,customerFields))}
export async function saveCustomer(input:Customer):Promise<Customer>{
 const now=new Date().toISOString();
 if(input.id){const patch=toDb({...input,updatedAt:now},customerFields);delete patch.id;delete patch.created_at;
  const rows=await db('customers','PATCH','id=eq.'+encodeURIComponent(input.id)+'&deleted_at=is.null',patch);if(!rows.length)throw new Error('NOT_FOUND');return fromDb<Customer>(rows[0],customerFields);
 }
 const record=toDb({...input,createdAt:now,updatedAt:now},customerFields);delete record.id;delete record.deleted_at;
 const rows=await db('customers','POST','',record);return fromDb<Customer>(rows[0],customerFields);
}
export async function removeCustomer(id:string){const rows=await db('customers','PATCH','id=eq.'+encodeURIComponent(id)+'&deleted_at=is.null',{deleted_at:new Date().toISOString()});if(!rows.length)throw new Error('NOT_FOUND')}
export async function audit(action:string,entity:string,entityId:string,brand:string,details:string,actor='authorized-user'){
 await db('audit_log','POST','',{actor,action,entity,entity_id:entityId,brand,details});
}
