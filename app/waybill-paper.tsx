import type {Waybill} from '@/lib/types';

const money=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value)+' ج.م';
const englishDigits=(value:string)=>value.replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0));

export function WaybillPaper({waybill:w}:{waybill:Waybill}){
 return (
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
    <div><span>قيمة الفاتورة</span><strong className="wb-latin">{money(w.invoiceAmount+w.shippingCost)}</strong></div>
    <div><span>المدفوع مقدمًا</span><strong className="wb-latin">{money(w.prepaid)}</strong></div>
    <div className="wb-collect"><span>المطلوب تحصيله</span><strong className="wb-latin">{money(w.collectionAmount)}</strong></div>
   </div><p><strong>طريقة الدفع:</strong> {w.paymentMethod||'—'}</p>
   {w.notes&&<p className="wb-notes"><strong>ملاحظات:</strong> {w.notes}</p>}
  </section>
  <footer>مرجع بوليصة: {englishDigits(w.reference)} — {w.orderId?'مرتبطة بأوردر محفوظ':'بوليصة مستقلة'}<small>هذه بوليصة داخلية للطباعة وليست بوليصة صادرة من شركة شحن.</small></footer>
 </article> );
}
