'use client';
import {useEffect,useState} from 'react';
import type {Waybill} from '@/lib/types';

const number=(v:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,numberingSystem:'latn'}).format(v);
const money=(v:number)=>number(v)+' ج.م';
const englishDigits=(value:string)=>value.replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0));
export default function WaybillPrint({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState(''),[waybill,setWaybill]=useState<Waybill|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;params.then(p=>{if(!active)return;setId(p.id);
 fetch('/api/waybills/'+encodeURIComponent(p.id),{credentials:'same-origin',cache:'no-store'}).then(async r=>{const json=await r.json();if(!r.ok)throw Error(json.error||'مش مسموح بفتح البوليصة');if(active)setWaybill(json.data)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'حصل خطأ')}).finally(()=>{if(active)setLoading(false)})
 });return()=>{active=false}},[params]);
 if(loading)return <main className="wb-status">جاري تجهيز البوليصة للطباعة...</main>;
 if(error||!waybill)return <main className="wb-status">{error||'البوليصة مش موجودة'} <a href="/">الرجوع للسيستم</a></main>;
 const w=waybill;
 return <main className="wb-print-root" dir="rtl">
 <div className="wb-actions"><a href="/">رجوع لإدارة الأوردرات</a><button onClick={()=>window.print()}>طباعة البوليصة / حفظ PDF</button></div>
 <article className="wb-paper">
  <header className="wb-header"><div><div className="wb-kicker">SHIPPING DOCUMENT</div><h1>{w.brand==='homey'?'هومي | HOMEY':'صدفة | SODFA'}</h1><p>بوليصة شحن داخلية — بيانات المستلم</p></div><div className="wb-reference"><strong>{englishDigits(w.reference)}</strong><small>تاريخ الإنشاء: {new Date(w.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',numberingSystem:'latn'})}</small></div></header>
  <section className="wb-info"><h2>بيانات المستلم</h2><div className="wb-info-grid">
   <div><span>اسم العميل</span><strong>{w.customerName}</strong></div>
   <div><span>رقم الهاتف</span><strong dir="ltr" className="wb-latin">{englishDigits(w.phone)}</strong></div>
   <div><span>هاتف بديل</span><strong dir="ltr" className="wb-latin">{englishDigits(w.alternatePhone||'—')}</strong></div>
   <div><span>المحافظة</span><strong>{w.governorate||'—'}</strong></div>
   <div><span>المدينة / المنطقة</span><strong>{w.city||'—'}</strong></div>
   <div className="wb-full"><span>العنوان بالتفصيل</span><strong>{w.address}</strong></div>
  </div></section>
  <section className="wb-info"><h2>تفاصيل الطلب والتحصيل</h2>
   {w.description&&<p className="wb-description"><strong>محتوى الشحنة:</strong> {w.description}</p>}
   <div className="wb-totals">
    <div><span>قيمة الفاتورة</span><strong className="wb-latin">{money(w.invoiceAmount)}</strong></div>
    <div><span>تكلفة الشحن</span><strong className="wb-latin">{money(w.shippingCost)}</strong></div>
    <div><span>المدفوع مقدمًا</span><strong className="wb-latin">{money(w.prepaid)}</strong></div>
    <div className="wb-collect"><span>المطلوب تحصيله</span><strong className="wb-latin">{money(w.collectionAmount)}</strong></div>
   </div><p><strong>طريقة الدفع:</strong> {w.paymentMethod||'—'}</p>
   {w.notes&&<p className="wb-notes"><strong>ملاحظات:</strong> {w.notes}</p>}
  </section>
  <footer>مرجع بوليصة: {englishDigits(w.reference)} — {w.orderId?'مرتبطة بأوردر محفوظ':'بوليصة مستقلة'}<small>هذه بوليصة داخلية للطباعة وليست بوليصة صادرة من شركة شحن.</small></footer>
 </article>
 <style jsx global>{`
 body:has(.wb-print-root),body:has(.wb-status){background:#f3f5f1;color:#1d2922}
 .wb-latin{font-family:"Segoe UI",Arial,sans-serif;font-variant-numeric:tabular-nums;unicode-bidi:isolate}
 .wb-kicker{font-family:"Segoe UI",Arial,sans-serif;letter-spacing:2px;font-size:9px;font-weight:800;color:#6b8064;margin-bottom:8px;direction:ltr;text-align:right}
 .wb-print-root{max-width:840px;margin:0 auto;padding:30px 18px;font-family:'Segoe UI',Tahoma,Arial,sans-serif}
 .wb-actions{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;gap:12px}
 .wb-actions button{border:0;background:#334e3c;color:white;border-radius:12px;padding:13px 22px;font-weight:750;box-shadow:0 8px 20px #2e513320}
 .wb-actions a{color:#43583c}
 .wb-paper{border:1px solid #dce5d9;border-top:7px solid #476447;border-radius:18px;padding:30px;background:white;box-shadow:0 20px 65px #203b2820}
 .wb-header{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #dbe5d9;padding-bottom:21px}
 .wb-header h1{font-size:27px;margin:0;color:#304c37;font-weight:850}.wb-header p{font-size:13px;margin:6px 0}
 .wb-reference{text-align:left;display:flex;flex-direction:column;gap:6px;direction:ltr}.wb-reference strong{font-size:21px;font-family:'Segoe UI',Arial,sans-serif;color:#304c37;letter-spacing:.4px}
 .wb-reference small{font-size:11px}
 .wb-info{margin-top:20px}.wb-info h2{font-size:16px;background:#edf3e9;color:#395640;border-radius:9px;padding:12px 14px;margin:0 0 14px}
 .wb-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 20px}
 .wb-info-grid>div{display:flex;flex-direction:column;gap:5px;min-width:0}
 .wb-info-grid span,.wb-totals span{font-size:12px;color:#69726a}
 .wb-info-grid strong{font-size:16px;overflow-wrap:anywhere}
 .wb-full{grid-column:1/-1}.wb-description,.wb-notes{white-space:pre-wrap;overflow-wrap:anywhere}
 .wb-totals{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .wb-totals>div{border:1px solid #dde3da;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:center}
 .wb-collect{background:#eaf2e8;border:2px solid #6c8b69!important;border-radius:9px}
 .wb-collect strong{font-size:21px}
 .wb-paper footer{color:#6e7d70;border-top:1px solid #dce6d9;padding-top:12px;margin-top:30px;font-size:11px;display:flex;flex-direction:column;gap:6px}
 .wb-status{text-align:center;margin:90px auto;font-size:19px}
 @media(max-width:600px){.wb-print-root{padding:8px}.wb-paper{padding:12px}.wb-info-grid,.wb-totals{grid-template-columns:1fr}.wb-header{flex-direction:column}.wb-reference{text-align:right}}
 @media print{@page{size:A5 portrait;margin:9mm}
  .wb-actions{display:none!important}
  .wb-print-root{max-width:none;margin:0;padding:0}
  .wb-paper{padding:12px;border:1px solid #222;border-radius:0;box-shadow:none}
  .wb-info{margin-top:10px}.wb-info-grid{gap:6px}.wb-info h2{margin-bottom:7px}
  .wb-totals{gap:5px}.wb-totals>div{padding:6px}
  .wb-info-grid,.wb-totals{grid-template-columns:1fr 1fr}
  .wb-info,.wb-paper{break-inside:avoid}
 }
 `}</style>
 </main>;
}
