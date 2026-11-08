'use client';
import {useEffect,useState} from 'react';
import type {Waybill} from '@/lib/types';
import {WaybillPrintSheets} from '@/components/waybill-print-sheets';

export default function WaybillPrint({params}:{params:Promise<{id:string}>}){
 const [record,setRecord]=useState<Waybill|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [perPage,setPerPage]=useState<3|4>(4);
 useEffect(()=>{
  let active=true;
  params.then(async({id})=>{
   try{
    const response=await fetch('/api/waybills/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
    const json=await response.json();
    if(!response.ok)throw Error(json.error||'تعذر تحميل البوليصة');
    if(active)setRecord(json.data);
   }catch(e){if(active)setError(e instanceof Error?e.message:'تعذر تحميل البوليصة')}
   finally{if(active)setLoading(false)}
  });
  return()=>{active=false};
 },[params]);
 if(loading)return <main className="shipping-print-state">جاري تجهيز بوليصة الشحن...</main>;
 if(!record||error)return <main className="shipping-print-state">{error||'البوليصة غير موجودة'} <a href="/">الرجوع للوحة التحكم</a></main>;
 return <main className="shipping-print-view" dir="rtl">
   <div className="shipping-print-toolbar">
    <a href="/">الرجوع لإدارة الطلبات</a>
    <div className="shipping-print-controls">
     <label>عدد البوالص في ورقة A4
      <select value={perPage} onChange={e=>setPerPage(Number(e.target.value) as 3|4)}><option value={4}>4 بوالص</option><option value={3}>3 بوالص</option></select>
     </label>
     <button onClick={()=>window.print()}>طباعة / حفظ PDF</button>
    </div>
   </div>
   <p className="shipping-print-help">دي معاينة ملصق الشحن المختصر. لو بتطبع بوليصة واحدة هتظهر في أول مكان من الورقة، وتقدر تجمع 3 أو 4 بوالص من صفحة «البوالص».</p>
   <WaybillPrintSheets waybills={[record]} perPage={perPage}/>
 </main>;
}
