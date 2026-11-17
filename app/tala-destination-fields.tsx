'use client';

import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './language';
import {govs} from '@/lib/types';
import type {TalaOption} from '@/lib/tala-connection';

import {normalizeTalaAreaName,providerZoneGovernorates,type TalaCoverageGroup} from '@/lib/tala-coverage';

type TalaArea={
 key:string;
 label:string;
 storedName:string;
 zoneId:string;
 subzoneId:string;
};

export function TalaDestinationFields({governorate,city,locations,retryOrder=false,price,onRateChange,onZoneSelected,onAreaSelected}:{governorate:string;city:string;locations:Record<string,string[]>;retryOrder?:boolean;price:number;onRateChange:(rate:number)=>void;onZoneSelected?:(zone:string)=>void|Promise<void>;onAreaSelected?:(area:string)=>void|Promise<void>}){
 const {language}=useLanguage();
 const [service,setService]=useState('');
 const [zone,setZone]=useState('');
 const [subzone,setSubzone]=useState('');
 const [services,setServices]=useState<TalaOption[]>([]);
 const [serviceCoverage,setServiceCoverage]=useState<TalaCoverageGroup[]>([]);
 const [areas,setAreas]=useState<TalaArea[]>([]);
 const [failed,setFailed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [areasLoading,setAreasLoading]=useState(false);
 const [noCoverage,setNoCoverage]=useState(false);
 const [retry,setRetry]=useState(0);
 const [weight,setWeight]=useState('1');
 const [fee,setFee]=useState<number|null>(null);
 const [feeLoading,setFeeLoading]=useState(false);
 const [feeFailed,setFeeFailed]=useState(false);
 const rateChangeRef=useRef(onRateChange);
 const zoneSelectedRef=useRef(onZoneSelected);
 const areaSelectedRef=useRef(onAreaSelected);
 const areaRequestId=useRef(0);
 rateChangeRef.current=onRateChange;
 zoneSelectedRef.current=onZoneSelected;
 areaSelectedRef.current=onAreaSelected;
 const label=(ar:string,en:string)=>language==='ar'?ar:en;
 const selectedArea=areas.find(item=>item.key===subzone);
 const normalizedCity=normalizeTalaAreaName(city);
 const supportedZones=serviceCoverage.filter(group=>providerZoneGovernorates(group,locations).includes(governorate)||
  Boolean(normalizedCity)&&normalizeTalaAreaName(group.zone.name)===normalizedCity);
 const unassignedZones=serviceCoverage.filter(group=>providerZoneGovernorates(group,locations).length!==1);

 async function request(operation:string,id?:number,serviceId?:number,signal?:AbortSignal){
  const response=await fetch('/api/shipping-integrations/tala',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({brand:'homey',operation,language:(operation==='zones'||operation==='subzones')?'ar':language,id,...(serviceId?{serviceId}:{})}),signal,
  });
  if(!response.ok)throw new Error();
  const result=await response.json();
  if(operation==='coverage'){
   if(!result.data||!Array.isArray(result.data.groups))throw new Error();
   return result.data as {serviceId:number;groups:TalaCoverageGroup[]};
  }
  if(!Array.isArray(result.data))throw new Error();
  return result.data as TalaOption[];
 }

 useEffect(()=>{
  const controller=new AbortController();
  async function load(){
   setLoading(true);setFailed(false);setServices([]);setServiceCoverage([]);setAreas([]);setZone('');setSubzone('');setService('');
   try{
    const serviceList=await request('services',undefined,undefined,controller.signal) as TalaOption[];
    const activeServices=serviceList.filter(item=>Number.isSafeInteger(item.id)&&item.id>0&&Boolean(item.name));
    if(!activeServices.length)throw new Error();
    setServices(activeServices);
    if(activeServices.length===1)setService(String(activeServices[0].id));
   }catch{
    if(!controller.signal.aborted)setFailed(true);
   }finally{
    if(!controller.signal.aborted)setLoading(false);
   }
  }
  void load();
  return()=>controller.abort();
 },[language,retry]);

 useEffect(()=>{
  if(!service){setServiceCoverage([]);return}
  const controller=new AbortController();
  async function load(){
   setLoading(true);setFailed(false);setServiceCoverage([]);setAreas([]);setSubzone('');setFee(null);
   try{
    const result=await request('coverage',Number(service),undefined,controller.signal) as {serviceId:number;groups:TalaCoverageGroup[]};
    if(controller.signal.aborted)return;
    if(result.serviceId!==Number(service))throw new Error();
    setServiceCoverage(result.groups.filter(group=>Number.isSafeInteger(group.zone?.id)&&group.zone.id>0&&Boolean(group.zone.name)&&Array.isArray(group.subzones)));
   }catch{
    if(!controller.signal.aborted)setFailed(true);
   }finally{
    if(!controller.signal.aborted)setLoading(false);
   }
  }
  void load();
  return()=>controller.abort();
 },[service,language,retry]);

 useEffect(()=>{
  if(!service||!governorate){setAreas([]);setNoCoverage(false);return}
  if(loading)return;
  if(!serviceCoverage.length){setAreas([]);setNoCoverage(true);return}
  const controller=new AbortController();
  const requestId=++areaRequestId.current;
  async function load(){
   setAreasLoading(true);setNoCoverage(false);setAreas([]);setSubzone('');setFee(null);
   const roots=supportedZones;
   if(!roots.length){setNoCoverage(true);setAreasLoading(false);return}
   try{
    const found:TalaArea[]=[];
    for(const group of roots){
     if(controller.signal.aborted||requestId!==areaRequestId.current)return;
     const rootIsGovernorate=normalizeTalaAreaName(group.zone.name)===normalizeTalaAreaName(governorate);
     for(const area of group.subzones){
      if(!Number.isSafeInteger(area.id)||area.id<=0||!area.name)continue;
      const storedName=rootIsGovernorate?area.name:group.zone.name+' - '+area.name;
      const displayName=rootIsGovernorate?area.name:group.zone.name+' · '+area.name;
      found.push({key:String(group.zone.id)+':'+String(area.id),label:displayName,storedName,zoneId:String(group.zone.id),subzoneId:String(area.id)});
     }
    }
    const unique=new Map<string,TalaArea>();
    for(const item of found)if(!unique.has(item.key))unique.set(item.key,item);
    const list=[...unique.values()].sort((a,b)=>a.label.localeCompare(b.label,'ar'));
    if(!controller.signal.aborted&&requestId===areaRequestId.current){
     setAreas(list);
     const matched=list.find(item=>normalizeTalaAreaName(item.storedName)===normalizedCity||normalizeTalaAreaName(item.label)===normalizedCity)||
      (list.length===1&&!city?list[0]:undefined);
     if(matched){
      setZone(matched.zoneId);setSubzone(matched.key);
      void Promise.resolve().then(()=>areaSelectedRef.current?.(matched.storedName)).catch(()=>setSubzone(''));
     }else setZone('');
     if(!list.length)setNoCoverage(true);
    }
   }catch{
    if(!controller.signal.aborted&&requestId===areaRequestId.current)setFailed(true);
   }finally{
    if(!controller.signal.aborted&&requestId===areaRequestId.current)setAreasLoading(false);
   }
  }
  void load();
  return()=>controller.abort();
 },[service,governorate,city,serviceCoverage,locations,language,retry,loading]);

 useEffect(()=>{
  if(!service||!zone||!selectedArea||!Number.isFinite(price)||price<0||!Number.isFinite(Number(weight))||Number(weight)<=0)return;
  const controller=new AbortController();
  setFeeLoading(true);setFeeFailed(false);
  fetch('/api/shipping-integrations/tala',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({brand:'homey',operation:'fees',language,fees:{serviceId:Number(service),zoneId:Number(selectedArea.zoneId),subzoneId:Number(selectedArea.subzoneId),weight:Number(weight),price}}),cache:'no-store'})
   .then(async response=>{const result=await response.json();if(!response.ok)throw new Error();return result.data as {total:number}})
   .then(result=>{if(controller.signal.aborted||!Number.isFinite(result.total)||result.total<0)throw new Error();setFee(result.total);rateChangeRef.current(result.total)})
   .catch(()=>{if(!controller.signal.aborted){setFee(null);setFeeFailed(true)}})
   .finally(()=>{if(!controller.signal.aborted)setFeeLoading(false)});
  return()=>controller.abort();
 },[service,zone,subzone,selectedArea,weight,price,language,retry]);

 return <fieldset className="full tala-destination">
  <legend>{retryOrder?label('إعادة الإرسال لتالا','Retry Tala dispatch'):label('الإرسال التلقائي لتالا','Automatic dispatch to Tala')}</legend>
  <div className="formgrid order-basics">
   <label>{label('خدمة الشحن عند تالا','Tala shipping service')}
    <select className="field" name="talaService" required value={service} disabled={loading||failed} onChange={event=>{
     setService(event.target.value);setZone('');setSubzone('');setServiceCoverage([]);setAreas([]);setFee(null);
    }}><option value="">{label('اختار الخدمة','Select a service')}</option>
     {services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <label>{label('المحافظة','Governorate')}
    <select className="field" name="talaGovernorate" required value={governorate} disabled={loading||failed} onChange={event=>{
     const value=event.target.value;setZone('');setSubzone('');setAreas([]);setNoCoverage(false);setFee(null);
     if(value)void Promise.resolve().then(()=>zoneSelectedRef.current?.(value)).catch(()=>{});
    }}><option value="">{label('اختار المحافظة','Select a governorate')}</option>
     {govs.map(item=><option key={item} value={item}>{item}</option>)}
    </select></label>
   <label>{label('المنطقة','Area')}
    <select className="field" name="talaAreaChoice" required value={subzone} disabled={!governorate||!service||areasLoading||failed||!areas.length} onChange={event=>{
     const value=event.target.value;setSubzone(value);setFee(null);
     const area=areas.find(item=>item.key===value);
     if(area){setZone(area.zoneId);void Promise.resolve().then(()=>areaSelectedRef.current?.(area.storedName)).catch(()=>setSubzone(''))}
    }}><option value="">{areasLoading?label('جاري تحميل المناطق…','Loading areas…'):label('اختار المنطقة','Select an area')}</option>
     {areas.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}
    </select></label>
   <input type="hidden" name="talaAreaName" value={selectedArea?.storedName??''}/>
   <input type="hidden" name="talaZone" value={selectedArea?.zoneId??''}/>
   <input type="hidden" name="talaSubzone" value={selectedArea?.subzoneId??''}/>
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
  {service&&governorate&&subzone&&<p className="notice" role="status">{label('تكلفة الشحن حسب تسعيرة تالا: ','Shipping fee from Tala: ')}{feeLoading?label('جاري الحساب…','Calculating…'):fee!==null?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(fee)+' ج.م':label('غير متاحة حالياً','Unavailable right now')}</p>}
  {feeFailed&&<p className="notice" role="alert">{label('تعذّر حساب الشحن من تالا. راجع الخدمة والمنطقة أو أدخل السعر يدويًا.','Could not calculate Tala shipping. Check the service and area, or enter the fee manually.')}</p>}
  {loading&&<p className="muted" role="status">{label('جاري تحميل المحافظات والخدمات…','Loading governorates and services…')}</p>}
  {!loading&&!failed&&governorate&&noCoverage&&<div className="notice" role="status">
   <p>{label('ما قدرناش نربط مناطق تالا بالمحافظة المختارة من الأسماء الراجعة. ده لا يؤكد إن تالا ما عندهاش تغطية.','We could not match Tala’s returned areas to this governorate by name. This does not confirm Tala lacks coverage.')}</p>
   {unassignedZones.length>0&&<details><summary>{label('مناطق تالا التي لم تُربط بمحافظة','Tala zones not matched to a governorate')} ({unassignedZones.length})</summary>
    <ul>{unassignedZones.map(group=><li key={group.zone.id}>{group.zone.name}</li>)}</ul>
   </details>}
  </div>}
  {failed&&<p className="notice error" role="alert">{label('تعذّر تحميل خدمات أو مناطق تالا. أعد المحاولة أو راجع ربط تالا.','Could not load Tala services or areas. Retry or check the Tala connection.')}
   {' '}<button type="button" className="btn secondary tiny" onClick={()=>setRetry(value=>value+1)}>{label('أعد المحاولة','Retry')}</button></p>}
  <small className="muted">{label('اختر المحافظة أولًا؛ ستظهر المناطق التي تدعمها خدمة تالا المختارة فقط، وسيُرسل الطلب بمعرّفات تالا الصحيحة.','Choose the governorate first. Only areas supported by the selected Tala service are shown, using Tala’s exact IDs on dispatch.')}</small>
  <small className="muted">{retryOrder?label('اضغط حفظ وإعادة الإرسال بعد مراجعة بيانات الطرد.','Use Save and resend after checking the parcel details.'):label('حفظ الطلب هيبعت الشحنة لتالا.','Saving this order sends the shipment to Tala.')}</small>
 </fieldset>;
}
