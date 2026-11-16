'use client';

import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './language';
import type {TalaOption} from '@/lib/tala-connection';

const matchName=(value:string)=>value.normalize('NFKD').replace(/[\\p{M}ـ]/gu,'')
 .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().trim().replace(/\\s+/g,' ');

type TalaZoneChoice={key:string;name:string;idsByService:Record<string,string>};

function exactOption(options:TalaOption[],name:string){
 const expected=matchName(name);
 if(!expected)return '';
 const matches=options.filter(option=>matchName(option.name)===expected);
 return matches.length===1?String(matches[0].id):'';
}

export function TalaDestinationFields({governorate,city,retryOrder=false,price,onRateChange,onZoneSelected,onAreaSelected}:{governorate:string;city:string;retryOrder?:boolean;price:number;onRateChange:(rate:number)=>void;onZoneSelected?:(zone:string)=>void|Promise<void>;onAreaSelected?:(area:string)=>void|Promise<void>}){
 const {language}=useLanguage();
 const [service,setService]=useState('');
 const [zone,setZone]=useState('');
 const [subzone,setSubzone]=useState('');
 const [services,setServices]=useState<TalaOption[]>([]);
 const [zones,setZones]=useState<TalaZoneChoice[]>([]);
 const [subzones,setSubzones]=useState<TalaOption[]>([]);
 const [failed,setFailed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [subzonesLoading,setSubzonesLoading]=useState(false);
 const [retry,setRetry]=useState(0);
 const [weight,setWeight]=useState('1');
 const [fee,setFee]=useState<number|null>(null);
 const [feeLoading,setFeeLoading]=useState(false);
 const [feeFailed,setFeeFailed]=useState(false);
 const rateChangeRef=useRef(onRateChange);
 const zoneSelectedRef=useRef(onZoneSelected);
 const areaSelectedRef=useRef(onAreaSelected);
 rateChangeRef.current=onRateChange;
 zoneSelectedRef.current=onZoneSelected;
 areaSelectedRef.current=onAreaSelected;
 const label=(ar:string,en:string)=>language==='ar'?ar:en;
 const zoneChoice=zones.find(item=>item.key===zone);
 const zoneId=zoneChoice?.idsByService[service]??'';
 const availableServices=zoneChoice?services.filter(item=>Boolean(zoneChoice.idsByService[String(item.id)])):[];
 const subzoneRequestId=useRef(0);

 useEffect(()=>{
  const controller=new AbortController();
  async function request(operation:string,id?:number){
   const response=await fetch('/api/shipping-integrations/tala',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({brand:'homey',operation,language,id}),signal:controller.signal,
   });
   if(!response.ok)throw new Error();
   const result=await response.json();
   if(!Array.isArray(result.data))throw new Error();
   return result.data as TalaOption[];
  }
  async function load(){
   setFailed(false);setLoading(true);setZones([]);setServices([]);setZone('');setService('');setSubzone('');setSubzones([]);
   try{
    const serviceList=await request('services');
    const activeServices=serviceList.filter(item=>Number.isSafeInteger(item.id)&&item.id>0&&item.name);
    if(!activeServices.length)throw new Error();
    const zonesByName=new Map<string,TalaZoneChoice>();
    for(let offset=0;offset<activeServices.length;offset+=4){
     const batch=activeServices.slice(offset,offset+4);
     const lists=await Promise.all(batch.map(item=>request('zones',Number(item.id))));
     if(controller.signal.aborted)return;
     for(let index=0;index<batch.length;index++){
      const serviceId=String(batch[index].id);
      for(const item of lists[index]){
       if(!Number.isSafeInteger(item.id)||item.id<=0||!item.name)continue;
       const key=matchName(item.name);
       if(!key)continue;
       const existing=zonesByName.get(key)||{key,name:item.name,idsByService:{}};
       existing.idsByService[serviceId]=String(item.id);
       zonesByName.set(key,existing);
      }
     }
    }
    const zoneList=[...zonesByName.values()].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
    if(!zoneList.length)throw new Error();
    setServices(activeServices);
    setZones(zoneList);
   }catch{
    if(!controller.signal.aborted)setFailed(true);
   }finally{
    if(!controller.signal.aborted)setLoading(false);
   }
  }
  void load();
  return ()=>controller.abort();
 },[language,retry]);

 useEffect(()=>{
  if(!governorate||!zones.length)return;
  const key=matchName(governorate);
  const match=zones.find(item=>item.key===key);
  if(!match)return;
  setZone(match.key);
  setService(current=>match.idsByService[current]?current:Object.keys(match.idsByService)[0]||'');
 },[governorate,zones]);

 useEffect(()=>{
  if(!zoneId){setSubzones([]);setSubzone('');setSubzonesLoading(false);return}
  const controller=new AbortController();
  const requestId=++subzoneRequestId.current;
  async function load(){
   setSubzonesLoading(true);
   try{
    const response=await fetch('/api/shipping-integrations/tala',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({brand:'homey',operation:'subzones',language,id:Number(zoneId),serviceId:Number(service)}),signal:controller.signal,
    });
    if(!response.ok)throw new Error();
    const result=await response.json();
    if(!Array.isArray(result.data))throw new Error();
    if(controller.signal.aborted||requestId!==subzoneRequestId.current)return;
    const list=result.data as TalaOption[];
    setSubzones(list);
    const matched=exactOption(list,city);
    setSubzone(matched);
    const area=matched?list.find(item=>String(item.id)===matched):undefined;
    if(area)void Promise.resolve().then(()=>areaSelectedRef.current?.(area.name)).catch(()=>setSubzone(''));
   }catch{
    if(!controller.signal.aborted&&requestId===subzoneRequestId.current){setSubzones([]);setFailed(true)}
   }finally{
    if(!controller.signal.aborted&&requestId===subzoneRequestId.current)setSubzonesLoading(false);
   }
  }
  void load();
  return()=>controller.abort();
 },[zoneId,language,retry,city]);

 useEffect(()=>{
  if(!service||!zoneId||!subzone||!Number.isFinite(price)||price<0||!Number.isFinite(Number(weight))||Number(weight)<=0)return;
  const controller=new AbortController();
  setFeeLoading(true);setFeeFailed(false);
  fetch('/api/shipping-integrations/tala',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({brand:'homey',operation:'fees',language,fees:{serviceId:Number(service),zoneId:Number(zoneId),subzoneId:Number(subzone),weight:Number(weight),price}}),cache:'no-store'})
   .then(async response=>{const result=await response.json();if(!response.ok)throw new Error();return result.data as {total:number}})
   .then(result=>{if(controller.signal.aborted||!Number.isFinite(result.total)||result.total<0)throw new Error();setFee(result.total);rateChangeRef.current(result.total)})
   .catch(()=>{if(!controller.signal.aborted){setFee(null);setFeeFailed(true)}})
   .finally(()=>{if(!controller.signal.aborted)setFeeLoading(false)});
  return()=>controller.abort();
 },[service,zoneId,subzone,weight,price,language,retry]);

 return <fieldset className="full tala-destination">
  <legend>{retryOrder?label('إعادة الإرسال لتالا','Retry Tala dispatch'):label('الإرسال التلقائي لتالا','Automatic dispatch to Tala')}</legend>
  <div className="formgrid order-basics">
   <label>{label('المحافظة عند تالا','Tala governorate')}
    <select className="field" name="talaGovernorate" required value={zone} disabled={loading||failed} onChange={event=>{
     const value=event.target.value;
     const selected=zones.find(item=>item.key===value);
     setZone(value);setSubzone('');setSubzones([]);setFee(null);setFailed(false);
     const supported=selected?Object.keys(selected.idsByService):[];
     setService(current=>supported.includes(current)?current:supported[0]||'');
     if(selected)void Promise.resolve().then(()=>zoneSelectedRef.current?.(selected.name)).catch(()=>setZone(''));
    }}><option value="">{label('اختار المحافظة','Select a governorate')}</option>
     {zones.map(item=><option key={item.key} value={item.key}>{item.name}</option>)}
    </select></label>
   <label>{label('المنطقة عند تالا','Tala area')}
    <select className="field" name="talaSubzone" required value={subzone} disabled={!zoneId||subzonesLoading||failed} onChange={event=>{
     const value=event.target.value;
     setSubzone(value);setFee(null);
     const area=subzones.find(item=>String(item.id)===value);
     if(area)void Promise.resolve().then(()=>areaSelectedRef.current?.(area.name)).catch(()=>setSubzone(''));
    }}>
     <option value="">{subzonesLoading?label('جاري تحميل المناطق…','Loading areas…'):label('اختار المنطقة','Select an area')}</option>
     {subzones.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <label>{label('خدمة الشحن عند تالا','Tala shipping service')}
    <select className="field" name="talaService" required value={service} disabled={!zone||failed} onChange={event=>{
     setService(event.target.value);setSubzone('');setSubzones([]);setFee(null);
    }}><option value="">{label('اختار الخدمة','Select a service')}</option>
     {availableServices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <input type="hidden" name="talaZone" value={zoneId}/>
  </div>
  <div className="formgrid order-basics">
   <label>{label('وزن الشحنة بالكيلو','Shipment weight (kg)')}
    <input type="number" className="field" name="talaWeight" value={weight} onChange={event=>setWeight(event.target.value)} min="0.01" max="1000" step="0.01" inputMode="decimal" required/>
   </label>
   <label>{label('عدد الطرود','Number of parcels')}
    <input type="number" className="field" name="talaPieces" min="1" max="1000" step="1" inputMode="numeric" defaultValue="1" required/>
   </label>
   <label>{label('نوع الشحنة','Shipment type')}
    <select name="talaType" className="field" defaultValue="FDP" required>
     <option value="FDP">{label('توصيل عادي','Regular delivery')}</option>
    </select>
   </label>
   <label>{label('هل مسموح بفتح الطرد؟','Can the recipient open the parcel?')}
    <select name="talaOpenable" className="field" defaultValue="N" required>
     <option value="" disabled>{label('اختار','Select')}</option>
     <option value="Y">{label('مسموح','Allowed')}</option>
     <option value="N">{label('غير مسموح','Not allowed')}</option>
    </select>
   </label>
  </div>
  {service&&zoneId&&subzone&&<p className="notice" role="status">{label('تكلفة الشحن حسب تسعيرة تالا: ','Shipping fee from Tala: ')}{feeLoading?label('جاري الحساب…','Calculating…'):fee!==null?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(fee)+' ج.م':label('غير متاحة حالياً','Unavailable right now')}</p>}
  {feeFailed&&<p className="notice" role="alert">{label('تعذّر حساب الشحن من تالا. راجع الخدمة والمنطقة أو أدخل السعر يدويًا.','Could not calculate Tala shipping. Check the service and area, or enter the fee manually.')}</p>}
  {loading&&<p className="muted" role="status">{label('جاري تحميل كل المحافظات المتاحة لخدمات تالا…','Loading all governorates available across Tala services…')}</p>}
  {!loading&&!failed&&!zones.length&&<p className="notice" role="status">{label('تالا لم ترجع محافظات متاحة لأي خدمة فعّالة. راجع خدمات الحساب عند تالا.','Tala returned no governorates for active services. Check the account services with Tala.')}</p>}
  {!loading&&!failed&&zone&&!availableServices.length&&<p className="notice" role="status">{label('لا توجد خدمة شحن فعّالة لهذه المحافظة عند تالا.','Tala has no active shipping service for this governorate.')}</p>}
  {failed&&<p className="notice error" role="alert">{label('تعذّر تحميل كل المحافظات والمناطق من تالا. القائمة لم تكتمل، أعد المحاولة أو راجع ربط تالا.','Could not load the complete Tala governorate and area list. The list is incomplete; retry or check the Tala connection.')}
   {' '}<button type="button" className="btn secondary tiny" onClick={()=>setRetry(value=>value+1)}>{label('أعد المحاولة','Retry')}</button></p>}
  <small className="muted">{label('المحافظات مجمّعة من كل خدمات تالا الفعّالة، والمنطقة والخدمة يظلان مربوطين بالمعرّفات الصحيحة لإرسال الشحنة.','Governorates are combined across all active Tala services; the area and service remain paired with the exact IDs used for dispatch.')}</small>
  <small className="muted">{retryOrder?label('اضغط حفظ وإعادة الإرسال بعد مراجعة بيانات الطرد.','Use Save and resend after checking the parcel details.'):label('حفظ الطلب هيبعت الشحنة لتالا.','Saving this order sends the shipment to Tala.')}</small>
 </fieldset>;
}
