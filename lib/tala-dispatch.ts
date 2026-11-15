import {neon} from '@neondatabase/serverless';
import {collectionFromCustomer} from './carrier-tracking';
import {graphql,login} from './tala-api';
import {allowedTalaEndpoint,readTalaSettings} from './tala-settings-store';
import type {Order} from './types';

export type TalaDestination={serviceId:number;zoneId:number;subzoneId:number};
type DispatchResult={state:'sent';trackingCode:string}|{state:'review'|'unavailable'};
type Option={id:number};
const serviceQuery='query { listShippingServicesDropdown(input:{active:true}) { id } }';
const zoneQuery='query ($id:Int!) { listZonesDropdown(input:{active:true,service:{serviceId:$id}}) { id } }';
const subzoneQuery='query ($id:Int!) { listZonesDropdown(input:{active:true,parentId:$id}) { id } }';
const createQuery='mutation CreateShipment($input:ShipmentInput!) { saveShipment(input:$input) { id code } }';

export function parseTalaDestination(value:unknown):TalaDestination|null{
 if(!value||typeof value!=='object')return null;
 const {serviceId,zoneId,subzoneId}=value as TalaDestination;
 return [serviceId,zoneId,subzoneId].every(id=>Number.isInteger(id)&&id>0&&id<=2147483647)
  ?{serviceId,zoneId,subzoneId}:null;
}

export async function prepareTalaDispatch(destination:TalaDestination){
 const {input,endpoint,revision}=await readTalaSettings('homey');
 if(!input||!allowedTalaEndpoint(endpoint))throw new Error('Tala unavailable');
 const token=await login('homey:'+revision,endpoint,input);
 const [services,zones,subzones]=await Promise.all([
  graphql<{listShippingServicesDropdown:Option[]}>(endpoint,serviceQuery,{},'en',token),
  graphql<{listZonesDropdown:Option[]}>(endpoint,zoneQuery,{id:destination.serviceId},'en',token),
  graphql<{listZonesDropdown:Option[]}>(endpoint,subzoneQuery,{id:destination.zoneId},'en',token),
 ]);
 if(!services.listShippingServicesDropdown.some(item=>item.id===destination.serviceId)||
  !zones.listZonesDropdown.some(item=>item.id===destination.zoneId)||
  !subzones.listZonesDropdown.some(item=>item.id===destination.subzoneId))throw new Error('Invalid Tala destination');
 return {endpoint,token,destination};
}

export async function dispatchTalaOrder(order:Order,config:Awaited<ReturnType<typeof prepareTalaDispatch>>):Promise<DispatchResult>{
 const url=process.env.DATABASE_URL;
 if(!url)return {state:'unavailable'};
 const sql=neon(url);
 const {endpoint,token,destination}=config;
 try{
  const claim=await sql`INSERT INTO public.tala_order_shipments(order_id,state) VALUES (${order.id}::uuid,'sending')
   ON CONFLICT(order_id) DO NOTHING RETURNING order_id`;
  if(!claim.length){
   const [existing]=await sql`SELECT state,tracking_code FROM public.tala_order_shipments WHERE order_id=${order.id}::uuid`;
   return existing?.state==='sent'&&existing.tracking_code?{state:'sent',trackingCode:String(existing.tracking_code)}:{state:'review'};
  }
 }catch{return {state:'unavailable'}}

 try{
  const price=collectionFromCustomer(order);
  const {saveShipment:shipment}=await graphql<{saveShipment:{id:number;code:string}|null}>(endpoint,createQuery,{input:{
   serviceId:destination.serviceId,recipientZoneId:destination.zoneId,recipientSubzoneId:destination.subzoneId,
   refNumber:order.id,recipientName:order.customerName,recipientMobile:order.phone,
   recipientAddress:order.address.trim(),price,priceTypeCode:'INCLD',paymentTypeCode:price>0?'COLC':'PAID',
   description:order.items.map(item=>item.name+' × '+item.quantity).join(', ').slice(0,240),
  }},'en',token);
  if(!shipment?.code||!Number.isSafeInteger(shipment.id))throw new Error('Missing tracking code');
  await sql`UPDATE public.tala_order_shipments SET state='sent', tracking_code=${shipment.code}, external_id=${shipment.id},updated_at=now() WHERE order_id=${order.id}::uuid`;
  return {state:'sent',trackingCode:shipment.code};
 }catch{
  await sql`UPDATE public.tala_order_shipments SET state='review',updated_at=now() WHERE order_id=${order.id}::uuid`.catch(()=>{});
  return {state:'review'};
 }
}
