import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {authed,cookieName,issueSession,ready} from '@/lib/session';
export const runtime='nodejs';
export async function GET(){return NextResponse.json({authenticated:await authed(),configured:ready()})}
export async function POST(request:Request){if(!ready())return NextResponse.json({error:'Authentication is not configured'},{status:503});const {email,password}=await request.json();const same=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};if(typeof email!=='string'||typeof password!=='string'||!same(email,process.env.ADMIN_EMAIL!)||!same(password,process.env.ADMIN_PASSWORD!))return NextResponse.json({error:'بيانات الدخول غير صحيحة'},{status:401});const r=NextResponse.json({ok:true});r.cookies.set(cookieName,issueSession(email),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:7*86400});return r}
export async function DELETE(){const r=NextResponse.json({ok:true});r.cookies.delete(cookieName);return r}
