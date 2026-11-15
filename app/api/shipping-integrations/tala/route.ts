import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {talaShipmentDateRange,type TalaOption,type TalaTracking} from '@/lib/tala-connection';
import {authenticate,getStaff} from '@/lib/staff-auth';
import {allowedTalaEndpoint,readTalaSettings,writeTalaSettings,type TalaSettings} from '@/lib/tala-settings-store';
import type {Brand} from '@/lib/types';

export const dynamic = 'force-dynamic';

const queries = {
 login: 'mutation Login($input: LoginInput!) { login(input: $input) { token } }',
 services: 'query Services { listShippingServicesDropdown(input: { active: true }) { id name } }',
 zones: 'query Zones($id: Int!) { listZonesDropdown(input: { active: true, service: { serviceId: $id } }) { id name } }',
 subzones: 'query Subzones($id: Int!) { listZonesDropdown(input: { active: true, parentId: $id }) { id name } }',
 shipments: 'query Shipments($input: ListShipmentsFilterInput, $page: Int) { listShipments(input: $input, first: 100, page: $page) { paginatorInfo { hasMorePages } data { code refNumber status { code name } } } }',
 tracking: 'query Track($code: String) { shipment(code: $code) { code refNumber status { code name } } }',
};
const tokens = new Map<string,{token:string; expiresAt:number}>();
const logins = new Map<string,Promise<string>>();

function publicSettings(settings:TalaSettings){
 return {configured:Boolean(settings.input),username:settings.input?.username??'',endpoint:settings.endpoint,
  documentation:settings.documentation,support:settings.support,revision:settings.revision};
}

class TalaError extends Error {
 constructor(readonly code: 'unreachable'|'unauthenticated'|'rejected') { super(code); }
}

async function graphql<T>(endpoint:string,query: string, variables: object, language: 'ar'|'en', token?: string): Promise<T> {
 let response: Response;
 try {
  response = await fetch(endpoint, {
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

async function login(cacheKey:string,endpoint:string,input: {username:string;password:string}) {
 const cached=tokens.get(cacheKey);
 if (cached && cached.expiresAt > Date.now()) return cached.token;
 for(const [id,entry] of tokens)if(entry.expiresAt<=Date.now())tokens.delete(id);
 let pending=logins.get(cacheKey);
 if (!pending) {
  pending=graphql<{login:{token:string}}>(endpoint,queries.login,{input},'en').then(({login})=>{
   if (!login?.token) throw new TalaError('rejected');
   tokens.set(cacheKey,{token:login.token,expiresAt:Date.now()+60*60*1000});
   return login.token;
  }).finally(()=>logins.delete(cacheKey));
  logins.set(cacheKey,pending);
 }
 return pending;
}

export async function GET(request: Request) {
 const blocked=await requireAccess(request);
 if (blocked) return blocked;
 const brand=new URL(request.url).searchParams.get('brand');
 if (brand !== 'homey' && brand !== 'sodfa') return NextResponse.json({error:'invalid'},{status:400});
 try{
  return NextResponse.json(publicSettings(await readTalaSettings(brand)),{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'settings_unavailable'},{status:503})}
}

export async function PATCH(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 const body=await request.json().catch(()=>null);
 const {brand,revision,email,password,action}=body??{};
 if((brand!=='homey'&&brand!=='sodfa')||!Number.isSafeInteger(revision)||revision<0||
  typeof email!=='string'||email.length>254||typeof password!=='string'||!password||password.length>256||
  (action!=='save'&&action!=='remove')){
  return NextResponse.json({error:'invalid'},{status:400});
 }

 try{
  const current=await getStaff(request);
  if(!current||email.trim().toLowerCase()!==current.email.toLowerCase()){
   return NextResponse.json({error:'reauthentication_failed'},{status:403});
  }
  const confirmed=await authenticate(email,password);
  if(confirmed?.id!==current.id)return NextResponse.json({error:'reauthentication_failed'},{status:403});

  const settings=await readTalaSettings(brand);
  if(settings.revision!==revision)return NextResponse.json({error:'stale_settings'},{status:409});
  if(action==='remove')settings.input=null;
  else{
   const {endpoint,documentation,support,username,carrierPassword}=body;
   if(typeof endpoint!=='string'||endpoint.length>512||!allowedTalaEndpoint(endpoint)){
    return NextResponse.json({error:'endpoint_not_allowed'},{status:400});
   }
   if(typeof documentation!=='string'||documentation.length>512||
    typeof support!=='string'||support.length>254||(support&&!/^[^\s?&#]+@[^\s?&#]+\.[^\s?&#]+$/.test(support))||
    typeof username!=='string'||username.length>254||typeof carrierPassword!=='string'||carrierPassword.length>512){
    return NextResponse.json({error:'invalid'},{status:400});
   }
   if(documentation){
    let url:URL;
    try{url=new URL(documentation)}catch{return NextResponse.json({error:'invalid'},{status:400})}
    if(url.protocol!=='https:'||url.username||url.password)return NextResponse.json({error:'invalid'},{status:400});
   }
   const carrierUser=username.trim();
   const existingPassword=endpoint===settings.endpoint&&carrierUser===settings.input?.username?settings.input.password:'';
   const nextPassword=carrierPassword||existingPassword;
   if(settings.input&&!carrierUser)return NextResponse.json({error:'carrier_credentials_required'},{status:400});
   if(Boolean(carrierUser)!==Boolean(nextPassword))return NextResponse.json({error:'carrier_credentials_required'},{status:400});
   Object.assign(settings,{endpoint,documentation,support,input:carrierUser?{username:carrierUser,password:nextPassword}:null});
  }

  if(!await writeTalaSettings(brand,settings,current.id))return NextResponse.json({error:'stale_settings'},{status:409});
  return NextResponse.json(publicSettings({...settings,revision:revision+1}),{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'settings_unavailable'},{status:503})}
}

export async function POST(request: Request) {
 const blocked=await requireAccess(request);
 if (blocked) return blocked;
 const body=await request.json().catch(()=>null);
 const brand=body?.brand;
 if (brand !== 'homey' && brand !== 'sodfa') return NextResponse.json({error:'invalid'},{status:400});
 const operation:unknown=body.operation;
 const id=body.id;
 const code=typeof body.code==='string'?body.code.trim():'';
 const language=body.language==='en'?'en':'ar';
 if (operation!=='services' && operation!=='zones' && operation!=='subzones' && operation!=='tracking' && operation!=='shipments') {
  return NextResponse.json({error:'invalid'},{status:400});
 }
 if ((operation==='zones'||operation==='subzones') && (!Number.isSafeInteger(id)||id<1||id>2147483647)) {
  return NextResponse.json({error:'invalid'},{status:400});
 }
 if (operation==='tracking' && (!code||code.length>100)) return NextResponse.json({error:'invalid'},{status:400});
 const page:unknown=body.page;
 if(operation==='shipments'&&(typeof page!=='number'||!Number.isSafeInteger(page)||page<1||page>50)){
  return NextResponse.json({error:'invalid'},{status:400});
 }
 const variables=operation==='shipments'?{page,input:{date:talaShipmentDateRange(new Date())}}
  :operation==='services'?{}:operation==='tracking'?{code}:{id};
 type Data = {listShippingServicesDropdown?:TalaOption[];listZonesDropdown?:TalaOption[];shipment?:TalaTracking|null;
  listShipments?:{paginatorInfo:{hasMorePages:boolean};data:TalaTracking[]}};
 try {
  const {input,endpoint,revision}=await readTalaSettings(brand as Brand);
  if(!input)return NextResponse.json({error:'missing_credentials'},{status:409});
  if(!allowedTalaEndpoint(endpoint))return NextResponse.json({error:'endpoint_not_allowed'},{status:409});
  const cacheKey=brand+':'+revision;
  let token=await login(cacheKey,endpoint,input);
  let data: Data;
  try { data=await graphql<Data>(endpoint,queries[operation],variables,language,token); }
  catch (error) {
   if (!(error instanceof TalaError) || error.code!=='unauthenticated') throw error;
   if (tokens.get(cacheKey)?.token===token) tokens.delete(cacheKey);
   token=await login(cacheKey,endpoint,input);
   data=await graphql<Data>(endpoint,queries[operation],variables,language,token);
  }
  if(operation==='shipments'){
   const result=data.listShipments;
   if(!result||typeof result.paginatorInfo?.hasMorePages!=='boolean'||!Array.isArray(result.data))throw new TalaError('rejected');
   return NextResponse.json({data:{shipments:result.data,hasMore:result.paginatorInfo.hasMorePages}},{headers:{'Cache-Control':'no-store'}});
  }
  return NextResponse.json({data:operation==='tracking'?data.shipment??null:data.listShippingServicesDropdown??data.listZonesDropdown??[]});
 } catch (error) {
  return NextResponse.json({error:error instanceof TalaError?error.code:'unreachable'},{status:502});
 }
}
