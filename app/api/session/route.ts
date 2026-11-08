import {NextResponse} from 'next/server';
import {authenticate,getStaff,setStaffCookie,clearStaffCookie} from '@/lib/staff-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
export async function GET(req:Request){try{const user=await getStaff(req);return user?NextResponse.json({user},{headers:noStore}):NextResponse.json({error:'Sign in required'},{status:401,headers:noStore})}catch{return NextResponse.json({error:'تعذر التحقق من جلسة الدخول'},{status:503,headers:noStore})}}
export async function POST(req:Request){
 try{
  const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return NextResponse.json({error:'Invalid origin'},{status:403});
  const body=await req.json();const email=body?.email,password=body?.password;
  if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>256||!password)return NextResponse.json({error:'راجع البريد وكلمة المرور'},{status:400});
  const user=await authenticate(email,password);if(!user)return NextResponse.json({error:'بيانات الدخول غير صحيحة أو الحساب مقفول مؤقتًا'},{status:401,headers:noStore});
  const response=NextResponse.json({user},{headers:noStore});response.headers.append('Set-Cookie',setStaffCookie(user));return response;
 }catch{return NextResponse.json({error:'تعذر تسجيل الدخول حاليًا'},{status:503,headers:noStore})}
}
export async function DELETE(req:Request){const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return NextResponse.json({error:'Invalid origin'},{status:403});const response=NextResponse.json({ok:true},{headers:noStore});response.headers.append('Set-Cookie',clearStaffCookie());return response}
