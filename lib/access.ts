import {NextResponse} from 'next/server';
export const runtime='nodejs';
export async function requireAccess(request:Request):Promise<NextResponse|null>{
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const allowed=(process.env.ALLOWED_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!url||!key||!allowed.length)return NextResponse.json({error:'Supabase Auth or allowlist is not configured'},{status:503});
 const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return NextResponse.json({error:'Sign in required'},{status:401});
 try{
  const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)return NextResponse.json({error:'Invalid login session'},{status:401});
  const user=await response.json() as {email?:string;email_confirmed_at?:string};
  if(!user.email||!allowed.includes(user.email.toLowerCase())||!user.email_confirmed_at)
   return NextResponse.json({error:'Your email is not on the authorized team list'},{status:403});
  return null;
 }catch{return NextResponse.json({error:'Authentication verification unavailable'},{status:503})}
}
