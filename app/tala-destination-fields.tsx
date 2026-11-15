'use client';

import {useEffect,useState} from 'react';
import {useLanguage} from './language';
import type {TalaOption} from '@/lib/tala-connection';

const matchName=(value:string)=>value.normalize('NFKD').replace(/[\p{M}ـ]/gu,'')
 .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().trim().replace(/\s+/g,' ');

function exactOption(options:TalaOption[],name:string){
 const expected=matchName(name);
 if(!expected)return '';
 const matches=options.filter(option=>matchName(option.name)===expected);
 return matches.length===1?String(matches[0].id):'';
}

export function TalaDestinationFields({governorate,city,retryOrder=false}:{governorate:string;city:string;retryOrder?:boolean}){
 const {language}=useLanguage();
 const [service,setService]=useState('');
 const [zone,setZone]=useState('');
 const [subzone,setSubzone]=useState('');
 const [services,setServices]=useState<TalaOption[]>([]);
 const [zones,setZones]=useState<TalaOption[]>([]);
 const [subzones,setSubzones]=useState<TalaOption[]>([]);
 const [failed,setFailed]=useState(false);
 const [loading,setLoading]=useState(true);
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
  setFailed(false);setLoading(true);
  const load=zone?request('subzones',Number(zone)).then(list=>{
   if(controller.signal.aborted)return;
   setSubzones(list);setSubzone(current=>current||exactOption(list,city));
  }):service?request('zones',Number(service)).then(list=>{
   if(controller.signal.aborted)return;
   setZones(list);setZone(current=>current||exactOption(list,governorate));
  }):request('services').then(list=>{
   if(controller.signal.aborted)return;
   setServices(list);
   if(list.length===1)setService(String(list[0].id));
  });
  load.catch(()=>{if(!controller.signal.aborted)setFailed(true)})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return ()=>controller.abort();
 },[service,zone,language,retry,governorate,city]);

 return <fieldset className="full tala-destination">
  <legend>{retryOrder?label('إعادة الإرسال لتالا','Retry Tala dispatch'):label('الإرسال التلقائي لتالا','Automatic dispatch to Tala')}</legend>
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
  <div className="formgrid order-basics">
   <label>{label('وزن الشحنة بالكيلو','Shipment weight (kg)')}
    <input type="number" className="field" name="talaWeight" defaultValue="1" min="0.01" max="1000" step="0.01" inputMode="decimal" required/>
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
  {loading&&<p className="muted" role="status">{label('جاري تحميل خيارات تالا…','Loading Tala options…')}</p>}
  {!loading&&!failed&&service&&(!zones.length||(zone&&!subzones.length))&&
   <p className="notice" role="status">{label('تالا ما رجّعتش مناطق للخدمة أو المنطقة دي. جرّب اختيار تاني أو اطلب من تالا تفعيل المنطقة.','Tala returned no areas for this service or zone. Choose another option or ask Tala to enable the area.')}</p>}
  {failed&&<p role="alert">{label('تعذّر تحميل بيانات تالا. راجع الربط في الإعدادات.','Could not load Tala options. Check the connection in Settings.')}
   {' '}<button type="button" className="btn secondary tiny" onClick={()=>setRetry(value=>value+1)}>{label('أعد المحاولة','Retry')}</button></p>}
  <small className="muted">{label('راجع الوزن وعدد الطرود والسماح بالفتح لو الشحنة مختلفة عن العادي.','Check the weight, parcel count, and opening permission if this shipment differs from your usual orders.')}</small>
  <small className="muted">{retryOrder?label('اضغط حفظ وإعادة الإرسال بعد مراجعة بيانات الطرد.','Use Save and resend after checking the parcel details.'):label('حفظ الطلب هيبعت الشحنة لتالا.','Saving this order sends the shipment to Tala.')}</small>
 </fieldset>;
}
