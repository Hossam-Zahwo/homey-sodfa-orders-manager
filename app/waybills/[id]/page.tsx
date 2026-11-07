'use client';
import {useEffect,useState} from 'react';
import type {Waybill} from '@/lib/types';

const money=(v:number)=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(v)+' ج.م';
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
  <header className="wb-header"><div><h1>{w.brand==='homey'?'هومي | HOMEY':'صدفة | SODFA'}</h1><p>بوليصة شحن داخلية — بيانات المستلم</p></div><div className="wb-reference"><strong>{w.reference}</strong><small>تاريخ الإنشاء: {new Date(w.createdAt).toLocaleDateString('ar-EG')}</small></div></header>
  <section className="wb-info"><h2>بيانات المستلم</h2><div className="wb-info-grid">
   <div><span>اسم العميل</span><strong>{w.customerName}</strong></div>
   <div><span>رقم الهاتف</span><strong dir="ltr">{w.phone}</strong></div>
   <div><span>هاتف بديل</span><strong dir="ltr">{w.alternatePhone||'—'}</strong></div>
   <div><span>المحافظة</span><strong>{w.governorate||'—'}</strong></div>
   <div><span>المدينة / المنطقة</span><strong>{w.city||'—'}</strong></div>
   <div className="wb-full"><span>العنوان بالتفصيل</span><strong>{w.address}</strong></div>
  </div></section>
  <section className="wb-info"><h2>تفاصيل الطلب والتحصيل</h2>
   {w.description&&<p className="wb-description"><strong>محتوى الشحنة:</strong> {w.description}</p>}
   <div className="wb-totals">
    <div><span>قيمة الفاتورة</span><strong>{money(w.invoiceAmount)}</strong></div>
    <div><span>تكلفة الشحن</span><strong>{money(w.shippingCost)}</strong></div>
    <div><span>المدفوع مقدمًا</span><strong>{money(w.prepaid)}</strong></div>
    <div className="wb-collect"><span>المطلوب تحصيله</span><strong>{money(w.collectionAmount)}</strong></div>
   </div><p><strong>طريقة الدفع:</strong> {w.paymentMethod||'—'}</p>
   {w.notes&&<p className="wb-notes"><strong>ملاحظات:</strong> {w.notes}</p>}
  </section>
  <footer>مرجع بوليصة: {w.reference} — {w.orderId?'مرتبطة بأوردر محفوظ':'بوليصة مستقلة'}<small>هذه بوليصة داخلية للطباعة وليست بوليصة صادرة من شركة شحن.</small></footer>
 </article>
 <style jsx global>{`
 body:has(.wb-print-root),body:has(.wb-status){background:#fff;color:#1d2922}
 .wb-print-root{max-width:840px;margin:0 auto;padding:18px;font-family:Tahoma,Arial,sans-serif}
 .wb-actions{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;gap:12px}
 .wb-actions button{border:0;background:#63784a;color:white;border-radius:10px;padding:12px 20px;font-weight:bold}
 .wb-actions a{color:#43583c}
 .wb-paper{border:2px solid #324331;padding:25px;background:white}
 .wb-header{display:flex;justify-content:space-between;gap:15px;border-bottom:3px solid #63784a;padding-bottom:15px}
 .wb-header h1{font-size:25px;margin:0;color:#51643f}.wb-header p{font-size:13px;margin:6px 0}
 .wb-reference{text-align:left;display:flex;flex-direction:column;gap:6px;direction:ltr}.wb-reference strong{font-size:21px}
 .wb-reference small{font-size:11px}
 .wb-info{margin-top:20px}.wb-info h2{font-size:17px;background:#eef1e7;padding:10px;margin:0 0 14px}
 .wb-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 20px}
 .wb-info-grid>div{display:flex;flex-direction:column;gap:5px;min-width:0}
 .wb-info-grid span,.wb-totals span{font-size:12px;color:#69726a}
 .wb-info-grid strong{font-size:16px;overflow-wrap:anywhere}
 .wb-full{grid-column:1/-1}.wb-description,.wb-notes{white-space:pre-wrap;overflow-wrap:anywhere}
 .wb-totals{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .wb-totals>div{border:1px solid #dde3da;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:center}
 .wb-collect{background:#eaf0e2;border:2px solid #63784a!important}
 .wb-collect strong{font-size:21px}
 .wb-paper footer{border-top:1px solid #cbd4c4;padding-top:12px;margin-top:30px;font-size:11px;display:flex;flex-direction:column;gap:6px}
 .wb-status{text-align:center;margin:90px auto;font-size:19px}
 @media(max-width:600px){.wb-print-root{padding:8px}.wb-paper{padding:12px}.wb-info-grid,.wb-totals{grid-template-columns:1fr}.wb-header{flex-direction:column}.wb-reference{text-align:right}}
 @media print{@page{size:A5 portrait;margin:9mm}
  .wb-actions{display:none!important}
  .wb-print-root{max-width:none;margin:0;padding:0}
  .wb-paper{padding:12px;border:1px solid #222}
  .wb-info{margin-top:10px}.wb-info-grid{gap:6px}.wb-info h2{margin-bottom:7px}
  .wb-totals{gap:5px}.wb-totals>div{padding:6px}
  .wb-info-grid,.wb-totals{grid-template-columns:1fr 1fr}
  .wb-info,.wb-paper{break-inside:avoid}
 }
 `}</style>
 </main>;
}
