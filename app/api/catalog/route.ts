import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
export const runtime='nodejs';export const dynamic='force-dynamic';
type MediaFields={image_url?:string;primary_image_url?:string;cover_image_url?:string;thumbnail_url?:string;image_urls?:string[];images?:Array<string|{url?:string;image_url?:string}>};
function imageOf(row?:MediaFields){
 const images=Array.isArray(row?.images)?row.images:[];
 const urls=Array.isArray(row?.image_urls)?row.image_urls:[];
 return [row?.image_url,row?.primary_image_url,row?.cover_image_url,row?.thumbnail_url,...urls,...images.map(image=>typeof image==='string'?image:image?.url||image?.image_url)].find(url=>typeof url==='string'&&/^https?:\/\//i.test(url));
}
type Product=MediaFields&{id:string;title_ar:string;status:string};
type Variant=MediaFields&{product_id:string;sku:string|null;title_override:string|null;price_minor:number;status:string;is_listed:boolean};
export async function GET(req:Request){
 const blocked=await requireAccess(req);if(blocked)return blocked;
 const url=process.env.HOMEY_CATALOG_URL,key=process.env.HOMEY_CATALOG_KEY;
 if(!url||!key)return NextResponse.json({data:[],warning:'كتالوج هومي غير مربوط بعد — تقدر تضيف المنتجات يدويًا'},{headers:{'Cache-Control':'no-store'}});
 try{
  const headers={apikey:key};
  const [p,v]=await Promise.all([
   fetch(url+'/rest/v1/homly_products?select=*&status=eq.published&limit=500',{headers,cache:'no-store',signal:AbortSignal.timeout(15000)}),
   fetch(url+'/rest/v1/homly_product_variants?select=*&status=eq.published&is_listed=eq.true&limit=1000',{headers,cache:'no-store',signal:AbortSignal.timeout(15000)})
  ]);
  if(!p.ok||!v.ok)throw Error('Catalog request failed');
  const products=await p.json() as Product[],variants=await v.json() as Variant[];
  const titles=new Map(products.map(x=>[x.id,x]));
  const data=variants.filter(x=>titles.has(x.product_id)).map(x=>({name:[titles.get(x.product_id)?.title_ar,x.title_override].filter(Boolean).join(' — '),sku:x.sku||'',price:Number(x.price_minor||0)/100,imageUrl:imageOf(x)||imageOf(titles.get(x.product_id))})).filter(x=>x.name&&Number.isFinite(x.price));
  return NextResponse.json({data},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({data:[],warning:'تعذر تحميل منتجات هومي حاليًا؛ الإدخال اليدوي متاح'},{headers:{'Cache-Control':'no-store'}})}
}
