'use client';
import {useEffect,useState} from 'react';
import type {Waybill} from '@/lib/types';
import {WaybillPrintSheets} from '@/components/waybill-print-sheets';

export default function BatchWaybillPrint(){
 const [waybills,setWaybills]=useState<Waybill[]>([]);
 const [perPage,setPerPage]=useState<3|4>(4);
 const [printDate,setPrintDate]=useState('');
 useEffect(()=>{const now=new Date();const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);setPrintDate(local)},[]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const ids=new URLSearchParams(window.location.search).get('ids')?.split(',').filter(Boolean)||[];
    const unique=[...new Set(ids)];
    if(!unique.length||unique.length>100||unique.some(x=>!/^[0-9a-f-]{36}$/i.test(x)))throw Error('اختار من 1 إلى 100 بوليصة من لوحة الإدارة');
    const response=await fetch('/api/waybills',{credentials:'same-origin',cache:'no-store'});
    const body=await response.json();
    if(!response.ok)throw Error(body.error||'تعذر قراءة البوالص');
    const map=new Map<string,Waybill>((body.data as Waybill[]).map(w=>[w.id,w]));
    const selected=unique.map(id=>map.get(id)).filter((w):w is Waybill=>Boolean(w));
    if(selected.length!==unique.length)throw Error('في بوالص مش موجودة أو مش متاحة للطباعة');
    if(active)setWaybills(selected);
   }catch(e){if(active)setError(e instanceof Error?e.message:'تعذر تحميل البوالص')}
   finally{if(active)setLoading(false)}
  }
  void load();return()=>{active=false};
 },[]);
 if(loading)return <main className="shipping-print-state">جاري تجهيز البوالص للطباعة...</main>;
 if(error)return <main className="shipping-print-state">{error} <a href="/">الرجوع للوحة التحكم</a></main>;
 return <main className="shipping-print-view" dir="rtl">
   <div className="shipping-print-toolbar">
    <a href="/">الرجوع لإدارة الطلبات</a>
    <div className="shipping-print-controls">
     <span>عدد البوالص: {waybills.length}</span>
     <label className="shipping-print-date-control">تاريخ الطباعة
      <input type="date" value={printDate} onChange={e=>setPrintDate(e.target.value)} aria-label="تاريخ الطباعة على البوليصة"/>
     </label>
     <label>عدد البوالص في ورقة A4
      <select value={perPage} onChange={e=>setPerPage(Number(e.target.value) as 3|4)}>
       <option value={4}>4 بوالص / ورقة</option>
       <option value={3}>3 بوالص / ورقة</option>
      </select>
     </label>
     <button onClick={()=>window.print()}>طباعة / حفظ PDF</button>
    </div>
   </div>
   <p className="shipping-print-help">كل بوليصة فيها بيانات العميل والمطلوب تحصيله فقط. الخطوط الفاصلة بتحدد مكان القص على ورق A4.</p>
   <WaybillPrintSheets waybills={waybills} perPage={perPage} printDate={printDate}/>
 </main>;
}
