import { getUser } from '@netlify/identity';

declare const Netlify: { env: { get(name: string): string | undefined } };

// Edge guard runs ahead of Next.js route handlers. All customer data APIs are denied
// unless a signed-in Netlify Identity user is explicitly allowlisted server-side.
export default async function guard() {
  const allowed=(Netlify.env.get('ALLOWED_EMAILS')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!allowed.length)return new Response(JSON.stringify({error:'Access not configured'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
  try{
    const user=await getUser();
    if(!user?.email || !allowed.includes(user.email.trim().toLowerCase()))
      return new Response(JSON.stringify({error:'Not authorized'}),{status:403,headers:{'content-type':'application/json','cache-control':'no-store'}});
    return;
  }catch{
    return new Response(JSON.stringify({error:'Authentication unavailable'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }
}
export const config={path:'/api/*'};
