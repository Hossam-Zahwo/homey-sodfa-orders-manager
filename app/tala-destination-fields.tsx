'use client';

import {useEffect,useState} from 'react';
import {useLanguage} from './language';
import type {TalaOption} from '@/lib/tala-connection';

export function TalaDestinationFields(){
 const {language}=useLanguage();
 const [service,setService]=useState('');
 const [zone,setZone]=useState('');
 const [subzone,setSubzone]=useState('');
 const [services,setServices]=useState<TalaOption[]>([]);
 const [zones,setZones]=useState<TalaOption[]>([]);
 const [subzones,setSubzones]=useState<TalaOption[]>([]);
 const [failed,setFailed]=useState(false);
 const [retry,setRetry]=useState(0);
 const label=(ar:string,en:string)=>language==='ar'?ar:en;

 useEffect(()=>{
  const controller=new AbortController();
  async function request(operation:string,id?:number){
   const response=await fetch('/api/shipping-integrations/tala',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({brand:'homey',operation,language,id}),signal:controller.signal,
   });
   if(!response.ok)throw new Error();
   const result=await response.json();
   return result.data as TalaOption[];
  }
  setFailed(false);
  const load=zone?request('subzones',Number(zone)).then(setSubzones)
   :service?request('zones',Number(service)).then(setZones)
   :request('services').then(setServices);
  load.catch(()=>{if(!controller.signal.aborted)setFailed(true)});
  return ()=>controller.abort();
 },[service,zone,language,retry]);

 return <fieldset className="full tala-destination">
  <legend>{label('الإرسال التلقائي لتالا','Automatic dispatch to Tala')}</legend>
  <div className="formgrid order-basics">
   <label>{label('خدمة الشحن عند تالا','Tala shipping service')}
    <select className="field" name="talaService" required value={service} onChange={event=>{
     setService(event.target.value);setZone('');setSubzone('');setZones([]);setSubzones([]);
    }}><option value="">{label('اختار الخدمة','Select a service')}</option>
     {services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <label>{label('المنطقة عند تالا','Tala zone')}
    <select className="field" name="talaZone" required value={zone} onChange={event=>{
     setZone(event.target.value);setSubzone('');setSubzones([]);
    }}><option value="">{label('اختار المنطقة','Select a zone')}</option>
     {zones.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <label>{label('المنطقة الفرعية عند تالا','Tala subzone')}
    <select className="field" name="talaSubzone" required value={subzone} onChange={event=>setSubzone(event.target.value)}>
     <option value="">{label('اختار المنطقة الفرعية','Select a subzone')}</option>
     {subzones.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
  </div>
  {failed&&<p role="alert">{label('تعذّر تحميل بيانات تالا. راجع الربط في الإعدادات.','Could not load Tala options. Check the connection in Settings.')}
   {' '}<button type="button" className="btn secondary tiny" onClick={()=>setRetry(value=>value+1)}>{label('أعد المحاولة','Retry')}</button></p>}
  <small className="muted">{label('حفظ الطلب هيبعت الشحنة لتالا.','Saving this order sends the shipment to Tala.')}</small>
 </fieldset>;
}
