'use client';
import {useEffect} from 'react';
export default function Error({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('Orders manager error:',error)},[error]);
 return <main dir="rtl" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f6f7f5',fontFamily:'Tahoma,Arial,sans-serif',padding:20}}>
  <section style={{background:'#fff',padding:30,borderRadius:20,maxWidth:520,width:'100%',boxShadow:'0 3px 20px #00000010'}}>
   <h1 style={{color:'#687b4a'}}>تعذر عرض لوحة الأوردرات</h1>
   <p>حصل خطأ أثناء تحميل السيستم. البيانات الموجودة في Google Sheets لم يتم حذفها.</p>
   <p style={{color:'#686868',fontSize:13}}>تأكد إن آخر نشر على Netlify نجح وإن إعدادات Netlify Identity اتفعلت.</p>
   <button onClick={()=>reset()} style={{background:'#687b4a',color:'#fff',padding:'12px 18px',border:0,borderRadius:10,cursor:'pointer'}}>إعادة المحاولة</button>
  </section></main>
}
