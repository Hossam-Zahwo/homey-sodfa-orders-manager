'use client';
import type {Waybill} from '@/lib/types';

const latin=(value:string)=>String(value||'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0));
const currency=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,numberingSystem:'latn'}).format(Math.max(0,Number(value)||0))+' ج.م';

export function WaybillLabel({waybill:w}:{waybill:Waybill}){
 return <article className="shipping-label" dir="rtl">
   <header className="shipping-label-header"><strong>{w.brand==='homey'?'هومي':'صدفة'}</strong><span>{w.brand==='homey'?'HOMEY':'SODFA'}</span></header>
   <div className="shipping-label-title">بيانات المستلم</div>
   <div className="shipping-label-detail"><span>اسم العميل</span><strong>{w.customerName}</strong></div>
   <div className="shipping-label-detail"><span>رقم الهاتف</span><strong className="shipping-label-phone" dir="ltr">{latin(w.phone)}</strong></div>
   <div className="shipping-label-detail"><span>رقم بديل</span><strong className="shipping-label-phone" dir="ltr">{latin(w.alternatePhone||'—')}</strong></div>
   <div className="shipping-label-dual">
    <div className="shipping-label-detail"><span>المحافظة</span><strong>{w.governorate||'—'}</strong></div>
    <div className="shipping-label-detail"><span>المدينة / المنطقة</span><strong>{w.city||'—'}</strong></div>
   </div>
   <div className="shipping-label-detail shipping-label-address"><span>العنوان بالتفصيل</span><strong>{w.address}</strong></div>
   <div className="shipping-label-total"><span>المطلوب تحصيله</span><strong dir="ltr">{currency(w.collectionAmount)}</strong></div>
 </article>;
}

export function WaybillPrintSheets({waybills,perPage}:{waybills:Waybill[];perPage:3|4}){
 const chunks:Waybill[][]=[];
 for(let i=0;i<waybills.length;i+=perPage)chunks.push(waybills.slice(i,i+perPage));
 return <div className={'shipping-sheets shipping-sheets-'+perPage}>
  {chunks.map((group,idx)=><section className="shipping-sheet" key={idx} aria-label={'صفحة '+(idx+1)}>
    {group.map(w=><WaybillLabel key={w.id} waybill={w}/>)}
  </section>)}
 </div>;
}
