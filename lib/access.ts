import {NextResponse} from 'next/server';
import {auth} from '@/lib/auth/server';

// Every data endpoint checks a verified Neon Auth cookie AND the explicit email allowlist.
// Missing ALLOWED_EMAILS fails closed; no self-signup or anonymous data access.
export async function requireAccess(_request:Request):Promise<NextResponse|null>{
 const allow=(process.env.ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allow.length||!process.env.NEON_AUTH_BASE_URL||!process.env.DATABASE_URL)
  return NextResponse.json({error:'Dashboard access has not been enabled for the two authorized emails'},{status:503});
 try{
  const {data,error}=await auth.getSession();
  if(error||!data?.user?.email)return NextResponse.json({error:'Sign in required'},{status:401});
  if(!data.user.emailVerified||!allow.includes(data.user.email.toLowerCase()))
   return NextResponse.json({error:'This account is not on the authorized list'},{status:403});
  return null;
 }catch{return NextResponse.json({error:'Could not validate your login session'},{status:401})}
}
