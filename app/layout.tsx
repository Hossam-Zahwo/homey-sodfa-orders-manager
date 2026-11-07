import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'إدارة الطلبات | هومي وصدفة',description:'لوحة إدارة وتأكيد الطلبات الداخلية',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}
