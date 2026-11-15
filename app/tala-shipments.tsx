'use client';

import {useEffect,useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {useLanguage} from './language';
import {talaStatusGroups,type TalaShipmentPage,type TalaTracking} from '@/lib/tala-connection';
import type {Brand} from '@/lib/types';

type Snapshot = {shipments:TalaTracking[];updatedAt:Date;partial:boolean};
const api='/api/shipping-integrations/tala';
const refreshMs=3*60*1000;

export function TalaShipments({brand,revision,orderIds,openOrder}:{brand:Brand;revision:number;orderIds:ReadonlySet<string>;openOrder:(id:string)=>void}){
 const {language}=useLanguage();
 const label=(ar:string,en:string)=>language==='ar'?ar:en;
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('');
 const [busy,setBusy]=useState(false);
 const [limit,setLimit]=useState(30);
 const refresh=useRef<()=>void>(()=>{});

 useEffect(()=>{
  const controller=new AbortController();
  let pending=false;
  async function load(){
   if(pending||controller.signal.aborted)return;
   pending=true;
   setBusy(true);
   setError('');
   try{
    const shipments=new Map<string,TalaTracking>();
    let hasMore=true;
    for(let page=1;page<=50&&hasMore;page++){
     const response=await fetch(api,{
      method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({brand,language,operation:'shipments',page}),
     });
     const result=await response.json();
     if(!response.ok)throw new Error(result.error);
     const data:TalaShipmentPage=result.data;
     hasMore=data.hasMore;
     for(const shipment of data.shipments)if(shipment.code)shipments.set(shipment.code,shipment);
    }
    if(!controller.signal.aborted)setSnapshot({shipments:[...shipments.values()],updatedAt:new Date(),partial:hasMore});
   }catch(failure){
    if(!controller.signal.aborted)setError(failure instanceof Error?failure.message:'unreachable');
   }finally{
    pending=false;
    if(!controller.signal.aborted)setBusy(false);
   }
  }
  refresh.current=()=>{void load()};
  void load();
  const timer=window.setInterval(()=>{if(!document.hidden)void load()},refreshMs);
  return ()=>{window.clearInterval(timer);controller.abort()};
 },[brand,language,revision]);

 const shipments=snapshot?.shipments??[];
 const totals=new Map<string,number>();
 for(const shipment of shipments){
  const code=shipment.status?.code??'';
  totals.set(code,(totals.get(code)??0)+1);
 }
 const visible=filter?shipments.filter(shipment=>shipment.status?.code===filter):shipments;

 return <section className="tala-live-shipments">
  <div className="sectionhead">
   <div><h3>{label('شحنات تالا خلال آخر 30 يوم','Tala shipments over the last 30 days')}</h3>
    {snapshot&&<small className="muted">{label('آخر تحديث','Last updated')} {snapshot.updatedAt.toLocaleTimeString('en-GB',{timeStyle:'short',timeZone:'Africa/Cairo'})}</small>}</div>
   <button type="button" className="btn secondary" disabled={busy} onClick={()=>refresh.current()}>
    <RefreshCw size={16}/>{busy?label('جاري التحديث…','Refreshing…'):label('تحديث الشحنات','Refresh shipments')}
   </button>
  </div>
  {error&&<p className="notice error" role="alert">{error==='missing_credentials'?label('ضيف حساب تالا الأول.','Add your Tala account first.')
   :label('تعذّر قراءة شحنات تالا. راجع صلاحيات الحساب أو أعد المحاولة.','Could not load Tala shipments. Check account access or try again.')}
   {snapshot&&<> {label('ظاهر آخر تحديث ناجح.','Showing the last successful refresh.')}</>}</p>}
  {snapshot&&<>
   {snapshot.partial&&<p className="notice" role="status">{label('النتائج المعروضة جزئية لأن القائمة تخطّت حد الجلب.','The shipment list exceeded the fetch limit. Counts are partial.')}</p>}
   <div className="tracking-grid tracking-shipping">
    {talaStatusGroups.map(([code,ar,en])=><button className="tracking-card" type="button" key={code} aria-pressed={filter===code}
     onClick={()=>{setFilter(filter===code?'':code);setLimit(30)}}><span>{label(ar,en)}</span><strong>{totals.get(code)??0}</strong></button>)}
   </div>
   <div className="toolbar">
    <button type="button" className="btn secondary tiny" onClick={()=>{setFilter('');setLimit(30)}} aria-pressed={!filter}>{label('كل الشحنات','All shipments')} ({shipments.length})</button>
   </div>
   {visible.length>0?<div className="tracking-table-scroll" tabIndex={0}>
    <table className="table"><thead><tr><th>{label('رقم التتبع','Tracking number')}</th><th>{label('مرجع الأوردر','Order reference')}</th><th>{label('الحالة عند تالا','Tala status')}</th></tr></thead>
     <tbody>{visible.slice(0,limit).map(shipment=><tr key={shipment.code}>
      <td><bdi>{shipment.code}</bdi></td><td>{shipment.refNumber&&orderIds.has(shipment.refNumber)
       ?<button type="button" className="order-name-link" onClick={()=>openOrder(shipment.refNumber!)}><bdi>{shipment.refNumber}</bdi></button>
       :<bdi>{shipment.refNumber||'—'}</bdi>}</td><td>{shipment.status?.name||shipment.status?.code||'—'}</td>
     </tr>)}</tbody>
    </table>
   </div>:<p>{label('مفيش شحنات للعرض.','No shipments to show.')}</p>}
   {visible.length>limit&&<button className="btn secondary" type="button" onClick={()=>setLimit(limit+30)}>{label('عرض المزيد','Show more')}</button>}
  </>}
 </section>;
}
