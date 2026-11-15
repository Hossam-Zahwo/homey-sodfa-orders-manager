import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {talaCredentialNames,talaEndpoint,type TalaOption,type TalaTracking} from '@/lib/tala-connection';
import type {Brand} from '@/lib/types';

export const dynamic = 'force-dynamic';

const queries = {
 login: 'mutation Login($input: LoginInput!) { login(input: $input) { token } }',
 services: 'query Services { listShippingServicesDropdown(input: { active: true }) { id name } }',
 zones: 'query Zones($id: Int!) { listZonesDropdown(input: { active: true, service: { serviceId: $id } }) { id name } }',
 subzones: 'query Subzones($id: Int!) { listZonesDropdown(input: { active: true, parentId: $id }) { id name } }',
 tracking: 'query Track($code: String) { shipment(code: $code) { code refNumber status { code name } } }',
};
const tokens = new Map<Brand,{token:string; expiresAt:number}>();
const logins = new Map<Brand,Promise<string>>();

function credentials(brand: Brand) {
 const names=talaCredentialNames(brand);
 const username=process.env[names.username]?.trim();
 const password=process.env[names.password];
 return username && password ? {username,password} : null;
}

class TalaError extends Error {
 constructor(readonly code: 'unreachable'|'unauthenticated'|'rejected') { super(code); }
}

async function graphql<T>(query: string, variables: object, language: 'ar'|'en', token?: string): Promise<T> {
 let response: Response;
 try {
  response = await fetch(talaEndpoint, {
   method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
   headers: {'Content-Type':'application/json','Content-Language':language,...(token?{Authorization:'Bearer '+token}:{})},
   body: JSON.stringify({query,variables}),
  });
 } catch { throw new TalaError('unreachable'); }
 if (response.status === 401) throw new TalaError('unauthenticated');
 if (!response.ok) throw new TalaError('unreachable');
 const result = await response.json().catch(() => null);
 if (result?.errors?.some((error: {message?: string; extensions?: {code?:string}}) =>
  error.extensions?.code === 'UNAUTHENTICATED' || /^Unauthenticated\.?$/i.test(error.message ?? ''))) {
  throw new TalaError('unauthenticated');
 }
 if (result?.errors?.length || !result?.data) throw new TalaError('rejected');
 return result.data;
}

async function login(brand: Brand,input: {username:string;password:string}) {
 const cached=tokens.get(brand);
 if (cached && cached.expiresAt > Date.now()) return cached.token;
 let pending=logins.get(brand);
 if (!pending) {
  pending=graphql<{login:{token:string}}>(queries.login,{input},'en').then(({login})=>{
   if (!login?.token) throw new TalaError('rejected');
   tokens.set(brand,{token:login.token,expiresAt:Date.now()+60*60*1000});
   return login.token;
  }).finally(()=>logins.delete(brand));
  logins.set(brand,pending);
 }
 return pending;
}

export async function GET(request: Request) {
 const blocked=await requireAccess(request);
 if (blocked) return blocked;
 const brand=new URL(request.url).searchParams.get('brand');
 if (brand !== 'homey' && brand !== 'sodfa') return NextResponse.json({error:'invalid'},{status:400});
 return NextResponse.json({configured:Boolean(credentials(brand))},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request: Request) {
 const blocked=await requireAccess(request);
 if (blocked) return blocked;
 const body=await request.json().catch(()=>null);
 const brand=body?.brand;
 if (brand !== 'homey' && brand !== 'sodfa') return NextResponse.json({error:'invalid'},{status:400});
 const input=credentials(brand);
 if (!input) return NextResponse.json({error:'missing_credentials'},{status:409});
 const operation:unknown=body.operation;
 const id=body.id;
 const code=typeof body.code==='string'?body.code.trim():'';
 const language=body.language==='en'?'en':'ar';
 if (operation!=='services' && operation!=='zones' && operation!=='subzones' && operation!=='tracking') {
  return NextResponse.json({error:'invalid'},{status:400});
 }
 if ((operation==='zones'||operation==='subzones') && (!Number.isSafeInteger(id)||id<1||id>2147483647)) {
  return NextResponse.json({error:'invalid'},{status:400});
 }
 if (operation==='tracking' && (!code||code.length>100)) return NextResponse.json({error:'invalid'},{status:400});
 const variables=operation==='services'?{}:operation==='tracking'?{code}:{id};
 type Data = {listShippingServicesDropdown?:TalaOption[];listZonesDropdown?:TalaOption[];shipment?:TalaTracking|null};
 try {
  let token=await login(brand,input);
  let data: Data;
  try { data=await graphql<Data>(queries[operation],variables,language,token); }
  catch (error) {
   if (!(error instanceof TalaError) || error.code!=='unauthenticated') throw error;
   if (tokens.get(brand)?.token===token) tokens.delete(brand);
   token=await login(brand,input);
   data=await graphql<Data>(queries[operation],variables,language,token);
  }
  return NextResponse.json({data:operation==='tracking'?data.shipment??null:data.listShippingServicesDropdown??data.listZonesDropdown??[]});
 } catch (error) {
  return NextResponse.json({error:error instanceof TalaError?error.code:'unreachable'},{status:502});
 }
}
