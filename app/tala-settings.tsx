'use client';

import {useEffect, useState} from 'react';
import {useLanguage} from './language';
import {talaCredentialNames, talaDocumentation, talaEndpoint, talaSupport, type TalaOperation, type TalaOption, type TalaTracking} from '@/lib/tala-connection';
import type {Brand} from '@/lib/types';

export function TalaSettings({brand}: {brand: Brand}) {
 const {language}=useLanguage();
 const label=(ar:string,en:string)=>language==='en'?en:ar;
 const [configured,setConfigured]=useState<boolean|null>(null);
 const [configError,setConfigError]=useState(false);
 const [connected,setConnected]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [services,setServices]=useState<TalaOption[]>([]);
 const [zones,setZones]=useState<TalaOption[]>([]);
 const [subzones,setSubzones]=useState<TalaOption[]>([]);
 const [service,setService]=useState('');
 const [zone,setZone]=useState('');
 const [code,setCode]=useState('');
 const [tracking,setTracking]=useState<TalaTracking|null>();
 const credentials=talaCredentialNames(brand);
 const api='/api/shipping-integrations/tala';

 useEffect(()=>{
  const controller=new AbortController();
  fetch(api+'?brand='+brand,{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error();
   const data=await response.json();
   setConfigured(data.configured===true);
  }).catch(()=>{if(!controller.signal.aborted)setConfigError(true)});
  return ()=>controller.abort();
 },[brand]);

 async function request(operation:TalaOperation, value?:number|string) {
  setBusy(true);
  setError('');
  try {
   const response=await fetch(api,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({brand,operation,language,id:typeof value==='number'?value:undefined,code:typeof value==='string'?value:undefined}),
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error);
   switch(operation){
    case 'services': setServices(result.data);setConnected(true);break;
    case 'zones': setZones(result.data);break;
    case 'subzones': setSubzones(result.data);break;
    case 'tracking': setTracking(result.data);break;
   }
  } catch(e) {
   if(operation==='services')setConnected(false);
   setError(e instanceof Error?e.message:'unreachable');
  } finally {setBusy(false)}
 }

 return <section className="panel tala-settings">
  <div className="sectionhead"><h2>{label('إعدادات ربط تالا إكسبريس','Tala Express integration settings')}</h2>
   <span className="muted">{brand==='homey'?'HOMEY':'SODFA'}</span></div>
  <dl className="tala-connection-details">
   <dt>{label('طريقة الربط','Connection method')}</dt><dd>GraphQL · {label('اسم مستخدم وكلمة مرور من تالا','Tala-issued username and password')}</dd>
   <dt>Endpoint</dt><dd><code dir="ltr">{talaEndpoint}</code></dd>
   <dt>{label('التوثيق والدعم','Documentation and support')}</dt>
   <dd><a href={talaDocumentation} target="_blank" rel="noreferrer">{label('توثيق API','API documentation')}</a> · <a href={'mailto:'+talaSupport}>{talaSupport}</a></dd>
   <dt>{label('بيانات الدخول على السيرفر','Server credentials')}</dt>
   <dd><code dir="ltr">{credentials.username}</code> / <code dir="ltr">{credentials.password}</code></dd>
  </dl>
  <p role="status">{configError?label('تعذّر قراءة إعدادات الربط.','Could not load connection settings.')
   :connected?label('تم تسجيل الدخول وقراءة الخدمات.','Sign-in and service lookup succeeded.')
   :configured===null?label('جاري فحص الإعدادات…','Checking configuration…')
   :configured?label('بيانات الحساب موجودة. اختبر الاتصال.','Credentials are configured. Test the connection.')
   :label('في انتظار بيانات حساب تالا لهذا المتجر. تُضاف في إعدادات Vercel.','Waiting for this store’s Tala account. Add its credentials in Vercel.')}</p>
  <button className="btn" type="button" disabled={!configured||busy} onClick={()=>void request('services')}>
   {label('اختبار الاتصال وجلب الخدمات','Test connection and load services')}
  </button>
  {error&&<p className="notice error" role="alert">{error==='missing_credentials'
   ?label('بيانات حساب تالا مطلوبة.','Tala account credentials are required.')
   :error==='unreachable'?label('تعذّر الوصول إلى سيرفر تالا. حاول تاني.','Could not reach Tala. Try again.')
   :label('تالا رفضت الطلب. راجع بيانات الحساب والصلاحيات.','Tala rejected the request. Check account credentials and permissions.')}</p>}
  {connected&&<>
   <h3>{label('أكواد الخدمات والمناطق','Service and area codes')}</h3>
   <div className="toolbar">
    <label>{label('الخدمة','Service')} <select className="field" value={service} disabled={busy} onChange={event=>{
     const value=event.target.value;
     setService(value);setZone('');setZones([]);setSubzones([]);
     if(value)void request('zones',Number(value));
    }}><option value="">{label('اختار الخدمة','Select a service')}</option>
     {services.map(item=><option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</select></label>
    <label>{label('المنطقة','Zone')} <select className="field" value={zone} disabled={busy||!zones.length} onChange={event=>{
     const value=event.target.value;
     setZone(value);setSubzones([]);
     if(value)void request('subzones',Number(value));
    }}><option value="">{label('اختار المنطقة','Select a zone')}</option>
     {zones.map(item=><option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</select></label>
   </div>
   {zone && !busy && <div><strong>{label('المناطق الفرعية','Subzones')}</strong>
    {subzones.length?<ul>{subzones.map(item=><li key={item.id}>{item.name} ({item.id})</li>)}</ul>
    :<p>{label('مفيش مناطق فرعية معروضة.','No subzones to display.')}</p>}</div>}
   <h3>{label('استعلام عن شحنة موجودة','Look up an existing shipment')}</h3>
   <form className="toolbar" onSubmit={event=>{event.preventDefault();setTracking(undefined);void request('tracking',code.trim())}}>
    <label>{label('رقم تتبع تالا','Tala tracking number')} <input className="field" dir="ltr" value={code} maxLength={100} onChange={event=>setCode(event.target.value)} required /></label>
    <button className="btn secondary" disabled={busy||!code.trim()}>{label('استعلام','Look up')}</button>
   </form>
   {tracking===null&&<p role="status">{label('الشحنة مش موجودة في الحساب.','Shipment not found in this account.')}</p>}
   {tracking&&<p role="status"><b dir="ltr">{tracking.code}</b> · {tracking.status?.name??'—'} {tracking.refNumber&&<>· <bdi>{tracking.refNumber}</bdi></>}</p>}
  </>}
  <p className="muted">{label('اختبار الاتصال والاستعلام لا ينشئان شحنات. إرسال الطلبات وتحديثاتها آليًا يحتاج تفعيل منفصل.',
   'Connection tests and lookups do not create shipments. Automatic dispatch and updates require separate activation.')}</p>
 </section>;
}
