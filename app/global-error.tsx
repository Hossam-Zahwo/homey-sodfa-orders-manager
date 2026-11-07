'use client';
export default function GlobalError({reset}:{error:Error & {digest?:string};reset:()=>void}){
 return <html lang="ar" dir="rtl"><body style={{margin:0,background:'#f5f7f3',fontFamily:'Tahoma,Arial,sans-serif'}}>
  <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20}}>
   <section style={{background:'white',borderRadius:18,padding:28,maxWidth:460,width:'100%'}}>
    <h1 style={{color:'#697b4a'}}>تعذّر فتح سيستم الأوردرات</h1>
    <p>حصل خطأ في تحميل الصفحة. جرب تحديثها، أو اتأكد من حالة آخر Deploy على Netlify.</p>
    <button onClick={()=>reset()} style={{padding:'12px 22px',background:'#697b4a',color:'#fff',border:0,borderRadius:10}}>حاول تاني</button>
   </section>
  </main>
 </body></html>;
}
