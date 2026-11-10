'use client';
import {ProductPicker} from './product-picker';
import {WaybillPrintSheets} from '@/components/waybill-print-sheets';
import {useEffect,useState} from 'react';
import {LayoutDashboard,Package,Users,Settings,LogOut,Plus,Download,Trash2,Pencil,RefreshCcw,ShoppingBag,CheckCircle2,Wallet,Printer,FileText,FileDown,XCircle,ArrowUpLeft,ShieldCheck,Sparkles,Menu,X} from 'lucide-react';
import type {Brand,Order,Customer,Item,Waybill,Status} from '@/lib/types';
import {statuses,statusLabels,govs,totalOf} from '@/lib/types';
import {HomeyLogo} from '@/components/homey-logo';

type Tab='dashboard'|'orders'|'customers'|'settings';
const newOrder=(brand:Brand):Order=>({id:'',brand,createdAt:new Date().toLocaleDateString('en-CA'),updatedAt:'',version:0,customerName:'',phone:'',alternatePhone:'',governorate:'',city:'',address:'',source:'Facebook',paymentMethod:'الدفع عند الاستلام',prepaid:0,shipping:0,discount:0,items:[{name:'',sku:'',quantity:1,price:0}],status:'new',notes:'',assignedTo:'',deletedAt:''});
const newCustomer=(brand:Brand):Customer=>({id:'',brand,name:'',phone:'',alternatePhone:'',governorate:'',city:'',address:'',notes:'',createdAt:'',updatedAt:'',deletedAt:''});
const englishDigits=(value:string|number)=>String(value??'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0));
const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,numberingSystem:'latn'}).format(n);
const money=(n:number)=>number(n)+' ج.م';
const dateEN=(date:string)=>{const d=new Date(date);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',numberingSystem:'latn'})};
const columns=['رقم الطلب','العميل','التليفون','المنتجات','الإجمالي','الحالة','التاريخ','الإجراءات'];
function exportCsv(rows:Order[]){const headers=['ID','Brand','Created','Customer','Phone','Governorate','City','Address','Items','Total','Status','Notes'];const data=rows.map(o=>[o.id,o.brand,o.createdAt,o.customerName,o.phone,o.governorate,o.city,o.address,o.items.map(i=>`${i.name} × ${i.quantity}`).join(' | '),totalOf(o),statusLabels[o.status],o.notes]);const csv='\ufeff'+[headers,...data].map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='orders-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(a.href)}
async function api(path:string,method='GET',body?:unknown){const response=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},credentials:'same-origin',body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const json=await response.json();if(!response.ok)throw new Error(json.error||'حدث خطأ');return json}
export default function Page(){
 const [auth,setAuth]=useState<boolean|null>(null),[email,setEmail]=useState(''),[brand,setBrand]=useState<Brand>('homey'),[tab,setTab]=useState<Tab>('dashboard'),[orders,setOrders]=useState<Order[]>([]),[customers,setCustomers]=useState<Customer[]>([]),[waybills,setWaybills]=useState<Waybill[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[editing,setEditing]=useState<Order|null>(null),[editCustomer,setEditCustomer]=useState<Customer|null>(null),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[notice,setNotice]=useState(''),[loaded,setLoaded]=useState(false);
 const [password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[catalog,setCatalog]=useState<{name:string;sku:string;price:number;imageUrl?:string}[]>([]),[catalogNotice,setCatalogNotice]=useState('');
 const [bulkEditing,setBulkEditing]=useState<Order[]>([]);
 const [pdfHelp,setPdfHelp]=useState(false);
 const [selected,setSelected]=useState<string[]>([]);
 const [bulkStatus,setBulkStatus]=useState<Status>('preparing');
 const [printOrders,setPrintOrders]=useState<Order[]>([]);
 const [printDate,setPrintDate]=useState('');
 const [printDates,setPrintDates]=useState<Record<string,string>>({});

 const [navigationOpen,setNavigationOpen]=useState(false);
 const [period,setPeriod]=useState<'all'|'today'|'week'|'month'|'custom'>('all'),[fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState('');
 const theme=brand==='homey'?{'--primary':'#526647','--primary-dark':'#263b32','--soft':'#f0f4ec','--accent':'#bca57c'} as React.CSSProperties:{'--primary':'#713cad','--primary-dark':'#261432','--soft':'#f4ecfc','--accent':'#b490dc'} as React.CSSProperties;
 useEffect(()=>{let active=true;async function checkSession(){try{const response=await fetch('/api/whoami',{credentials:'same-origin',cache:'no-store'});if(active){setAuth(response.ok);if(!response.ok&&response.status!==401)setErr('تعذر التحقق من تسجيل الدخول')}}catch{if(active){setAuth(false);setErr('تعذر الاتصال بالسيرفر')}}}void checkSession();return()=>{active=false}},[]);
 useEffect(()=>{if(!auth||brand!=='homey')return;let active=true;fetch('/api/catalog',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(x=>{if(active){setCatalog(Array.isArray(x.data)?x.data:[]);setCatalogNotice(x.warning||'')}}).catch(()=>{if(active)setCatalogNotice('المنتجات غير متاحة دلوقتي؛ تقدر تضيفها يدويًا')});return()=>{active=false}},[auth,brand]);
 async function reload(){setBusy(true);setErr('');try{const [a,b,c]=await Promise.all([api('orders'),api('customers'),api('waybills')]);setOrders(a.data);setCustomers(b.data);setWaybills(c.data);setLoaded(true)}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 useEffect(()=>{if(auth)void reload()},[auth]);
 useEffect(()=>{
  if(!navigationOpen)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setNavigationOpen(false)};
  const onResize=()=>{if(window.innerWidth>1100)setNavigationOpen(false)};
  document.addEventListener('keydown',onKey);
  window.addEventListener('resize',onResize);
  const previousOverflow=document.body.style.overflow;
  if(window.innerWidth<=1100)document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize);document.body.style.overflow=previousOverflow};
 },[navigationOpen]);
 const inPeriod=(date:string)=>{const d=date.slice(0,10),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const dt=new Date(d+'T12:00:00');if(Number.isNaN(dt.getTime()))return false;if(period==='all')return true;if(period==='today')return dt.toDateString()===today.toDateString();if(period==='week'){const start=new Date(today);start.setDate(today.getDate()-((today.getDay()+6)%7));return dt>=start&&dt<=new Date(today.getTime()+86400000)}if(period==='month')return dt.getFullYear()===today.getFullYear()&&dt.getMonth()===today.getMonth();return (!fromDate||d>=fromDate)&&(!toDate||d<=toDate)};
 const periodOrders=orders.filter(o=>o.brand===brand&&inPeriod(o.createdAt));
 const visible=periodOrders.filter(o=>(filter==='all'||(filter==='active'?o.status!=='cancelled':o.status===filter))&&[o.customerName,o.phone,o.id,o.address,o.items.map(i=>i.name).join(' ')].join(' ').toLowerCase().includes(search.toLowerCase()));
 const allBrand=periodOrders;
 const allCustomerProfiles=new Map<string,Customer>();
 customers.filter(c=>c.brand===brand).forEach(c=>allCustomerProfiles.set(c.phone.replace(/\D/g,''),c));
 orders.filter(o=>o.brand===brand).forEach(o=>{const key=englishDigits(o.phone).replace(/\D/g,'');if(!allCustomerProfiles.has(key))allCustomerProfiles.set(key,{id:'',brand,name:o.customerName,phone:o.phone,alternatePhone:o.alternatePhone,governorate:o.governorate,city:o.city,address:o.address,notes:'',createdAt:o.createdAt,updatedAt:o.updatedAt,deletedAt:''})});
 const activeCustomers=[...allCustomerProfiles.values()].filter(c=>[c.name,c.phone,c.city].join(' ').toLowerCase().includes(search.toLowerCase()));
 const customerOrders=(phone:string)=>orders.filter(o=>o.brand===brand&&o.phone.replace(/\D/g,'')===phone.replace(/\D/g,''));
 const periodLabel:Record<typeof period,string>={all:'كل الفترات',today:'اليوم',week:'الأسبوع الحالي',month:'الشهر الحالي',custom:'فترة مخصصة'};
 const counts={all:allBrand.length,new:allBrand.filter(o=>o.status==='new').length,confirmed:allBrand.filter(o=>o.status==='confirmed').length,delivered:allBrand.filter(o=>o.status==='delivered').length};
 const revenue=allBrand.filter(o=>o.status==='delivered').reduce((s,o)=>s+totalOf(o),0);
 const cancelled=allBrand.filter(o=>o.status==='cancelled').length;
 const gross=allBrand.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+totalOf(o),0);
 async function logout(){await fetch('/api/session',{method:'DELETE',credentials:'same-origin'}).catch(()=>{});setAuth(false);setOrders([]);setCustomers([]);setWaybills([]);setSelected([]);setPrintOrders([]);setBulkEditing([])}
 const productHistory=new Map<string,Item>();
 for(const order of orders){
  if(order.brand!==brand)continue;
  for(const item of order.items){
   const key=item.sku+'|'+item.name;
   const existing=productHistory.get(key);
   if(!existing)productHistory.set(key,item);
   else if(!existing.imageUrl&&item.imageUrl)productHistory.set(key,{...existing,imageUrl:item.imageUrl});
  }
 }
 if(brand==='homey')for(const product of catalog){
  const key=product.sku+'|'+product.name;
  const previous=productHistory.get(key);
  productHistory.set(key,{...product,quantity:1,imageUrl:product.imageUrl||previous?.imageUrl});
 }
 const products=[...productHistory.values()];
 const selectedOrders=visible.filter(o=>selected.includes(o.id));
 function showOrders(status:string){
  setTab('orders');setFilter(status);setSearch('');setSelected([]);
 }
 function preview(rows:Order[]){
  setPrintDate(new Date().toLocaleDateString('en-CA'));
  setPdfHelp(false);
  setPrintDates({});
  setPrintOrders(rows);
 }
 function fromCustomer(c:Customer){
  const latest=customerOrders(c.phone).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  preview([{...(latest??newOrder(c.brand)),customerName:c.name,phone:c.phone,
   alternatePhone:c.alternatePhone||latest?.alternatePhone||'',governorate:c.governorate||latest?.governorate||'',
   city:c.city||latest?.city||'',address:c.address||latest?.address||''}]);
 }
 function printable(o:Order):Waybill{
  const saved=waybills.find(w=>w.brand===o.brand&&(o.id?w.orderId===o.id:w.phone===o.phone));
  if(saved)return {...saved,address:o.address?.trim()||saved.address};
  const invoiceAmount=totalOf(o);
  return {id:o.id||o.phone,orderId:o.id||null,customerId:null,brand:o.brand,createdAt:printDate+'T12:00:00',updatedAt:o.updatedAt,
   reference:o.id?'#'+o.id.slice(0,8).toUpperCase():'—',customerName:o.customerName,phone:o.phone,
   alternatePhone:o.alternatePhone,governorate:o.governorate,city:o.city,address:o.address,
   invoiceAmount,shippingCost:0,prepaid:o.prepaid,collectionAmount:Math.max(0,invoiceAmount-o.prepaid),
   paymentMethod:o.paymentMethod,description:o.items.filter(i=>i.name).map(i=>i.name+' × '+i.quantity).join('، '),notes:o.notes};
 }
 async function updateOrders(rows:Order[],action:Status|'delete'|Partial<Order>){
  if(!rows.length||busy)return;
  if((action==='delete'||action==='cancelled')&&!confirm(action==='delete'?'حذف الطلبات المحددة؟':'إلغاء الطلبات المحددة؟'))return;
  setBusy(true);setErr('');setNotice('');
  const completed:string[]=[];
  const errors:string[]=[];
  for(const order of rows){
   try{
    if(action==='delete'){
     await api('orders','DELETE',{id:order.id,version:order.version});
     setOrders(current=>current.filter(o=>o.id!==order.id));
    }else{
     const result=await api('orders','POST',{...order,...(typeof action==='string'?{status:action}:action)});
     setOrders(current=>current.map(o=>o.id===order.id?result.data:o));
    }
    completed.push(order.id);
   }catch(e){errors.push((e as Error).message)}
  }
  setSelected(current=>current.filter(id=>!completed.includes(id)));
  if(completed.length)setNotice('تم تحديث '+number(completed.length)+' طلب');
  if(errors.length)setErr('تعذّر تحديث '+number(errors.length)+' طلب. '+errors[0]);
  setBulkEditing(current=>current.filter(order=>!completed.includes(order.id)));
  setBusy(false);
 }
 function saveBulk(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const fields=new FormData(e.currentTarget);
  const patch:Partial<Order>={};
  for(const key of ['governorate','city','source','paymentMethod','assignedTo','notes'] as const){
   const value=String(fields.get(key)??'').trim();
   if(value)patch[key]=value;
  }
  for(const key of ['shipping','discount','prepaid'] as const){
   const value=String(fields.get(key)??'');
   if(value!=='')patch[key]=Number(value);
  }
  if(!Object.keys(patch).length){setErr('ادخل قيمة في خانة واحدة على الأقل');return}
  void updateOrders(bulkEditing,patch);
 }
 async function saveOrder(e:React.FormEvent){e.preventDefault();if(!editing)return;setBusy(true);setErr('');try{await api('orders','POST',editing);setEditing(null);setNotice('تم حفظ الطلب');await reload()}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 async function saveCustomer(e:React.FormEvent){e.preventDefault();if(!editCustomer)return;setBusy(true);setErr('');try{await api('customers','POST',editCustomer);setEditCustomer(null);setNotice('تم حفظ العميل');await reload()}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 async function deleteCustomer(c:Customer){if(!confirm('حذف العميل من القائمة؟'))return;setBusy(true);try{await api('customers','DELETE',{id:c.id,brand:c.brand});await reload()}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 if(auth===null)return <div className="login" style={theme}><section className="panel login-card"><div className="logo-circle"><ShieldCheck size={25}/></div><h2>تأمين لوحة الإدارة</h2><p className="muted">جاري التحقق من صلاحية الدخول…</p></section></div>;
 if(!auth)return <div className="login login-split" style={theme}>
 <aside className="login-showcase"><div className="showcase-head"><div className="showcase-login-logo"><HomeyLogo className="login-homey-logo"/></div><span className="showcase-sodfa-brand">&amp; SODFA</span></div><h2>نظام إدارة الطلبات</h2><p>إدارة المتجرين من مكان واحد — عملاء، أوردرات، شحن وفواتير.</p><div className="showcase-cards"><div><ShoppingBag/><strong>الأوردرات</strong><small>متابعة كل طلب</small></div><div><Users/><strong>العملاء</strong><small>بيانات محفوظة</small></div><div><Printer/><strong>الفواتير</strong><small>طباعة بسهولة</small></div></div><div className="showcase-stamp">PRIVATE ORDER WORKSPACE</div></aside>
 <section className="panel login-premium"><div className="logo-circle"><ShieldCheck size={28}/></div><p className="login-eyebrow">HOMEY & SODFA</p><h1>تسجيل الدخول</h1><p className="muted">ادخل بحساب الإدارة الخاص بيك علشان تتابع الطلبات.</p>{err&&<div className="notice error">{err}</div>}
 <form onSubmit={async(e)=>{e.preventDefault();setBusy(true);setErr('');try{const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email,password})});const x=await r.json();if(!r.ok)throw Error(x.error||'تعذر تسجيل الدخول');setPassword('');setAuth(true);setNotice('تم تسجيل الدخول بنجاح')}catch(e){setErr(e instanceof Error?e.message:'تعذر تسجيل الدخول')}finally{setBusy(false)}}}>
 <label>البريد الإلكتروني<input autoComplete="username" type="email" className="field" placeholder="example@domain.com" dir="ltr" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
 <label>كلمة المرور<div className="password-wrap"><input id="staff-password" name="password" autoComplete="current-password" type={showPassword?'text':'password'} className="field" placeholder="اكتب كلمة المرور" dir="ltr" value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" className="password-toggle" aria-controls="staff-password" aria-label={showPassword?'إخفاء كلمة المرور':'إظهار كلمة المرور'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'إخفاء':'إظهار'}</button></div></label>
 <button className="btn login-submit" disabled={busy}>{busy?'جاري تسجيل الدخول…':'دخول إلى لوحة التحكم'} <ArrowUpLeft size={17}/></button><div className="login-foot"><ShieldCheck size={15}/> دخول آمن لحسابات الإدارة المصرّح لها فقط</div></form>
 </section></div>;
 const nav:[Tab,string,React.ReactNode][]=[['dashboard','الرئيسية',<LayoutDashboard size={19} key="a"/>],['orders','الأوردرات',<Package size={19} key="b"/>],['customers','العملاء',<Users size={19} key="c"/>],['settings','الإعدادات',<Settings size={19} key="d"/>]];
 return <div className="app" data-brand={brand} style={theme}>
 {navigationOpen&&<button type="button" className="mobile-nav-backdrop" aria-label="إغلاق قائمة التنقل" onClick={()=>setNavigationOpen(false)}/>}
 <aside className={'sidebar '+(navigationOpen?'sidebar-open':'')} id="app-main-navigation" aria-label="القائمة الرئيسية">
 <div className="sidebar-mobile-header"><span>القائمة الرئيسية</span><button type="button" aria-label="إغلاق القائمة" onClick={()=>setNavigationOpen(false)}><X size={23}/></button></div><div className={'brand '+(brand==='homey'?'homey-brand':'')} role="group" aria-label={brand==='homey'?'هومي — لوحة الإدارة':'صدفة — لوحة الإدارة'}>{brand==='homey'?<div className="brand-logo-surface"><HomeyLogo className="dashboard-homey-logo"/></div>:<><div className="brand-mark">ص</div><div className="brand-copy"><strong>صدفة</strong><small>SODFA / MANAGER</small></div></>}</div><div className="sidebar-caption">WORKSPACE</div><nav className="nav" aria-label="أقسام مدير الطلبات">{nav.map(([key,label,icon])=><button key={key} type="button" className={tab===key?'active':''} aria-current={tab===key?'page':undefined} onClick={()=>{setTab(key);setSelected([]);setFilter('all');setSearch('');setNavigationOpen(false)}}>{icon} <span className="label">{label}</span></button>)}</nav><div className="sidebar-bottom"><ShieldCheck size={17}/><span>لوحة إدارة خاصة وآمنة<small>PRIVATE DASHBOARD</small></span></div></aside><main className="main"><header className="header"><div className="header-heading"><button type="button" className="mobile-nav-trigger" aria-label="فتح القائمة الجانبية" aria-controls="app-main-navigation" aria-expanded={navigationOpen} onClick={()=>setNavigationOpen(true)}><Menu size={22}/><span>القائمة</span></button><div className="header-title"><h1>{tab==='dashboard'?'نظرة عامة':tab==='orders'?'إدارة الأوردرات':tab==='customers'?'بيانات العملاء':'الإعدادات'}</h1><div className="muted">تابع كل تفاصيل المتجر المختار بسهولة ومن مكان واحد</div></div></div><div className="toolbar top-actions"><span className="workspace-status"><span className="status-dot"/> متصل وآمن</span><div className="brand-switch" role="group" aria-label="اختيار المتجر"><button type="button" className={'brand-switch-option '+(brand==='homey'?'active':'')} aria-pressed={brand==='homey'} onClick={()=>{setBrand('homey');setSearch('');setFilter('all')}}><HomeyLogo className="switch-homey-logo"/></button><button type="button" className={'brand-switch-option '+(brand==='sodfa'?'active':'')} aria-pressed={brand==='sodfa'} onClick={()=>{setBrand('sodfa');setSearch('');setFilter('all')}}>صدفة</button></div><button className="btn secondary" title="تحديث" onClick={reload} disabled={busy}><RefreshCcw size={16}/></button><button className="btn secondary" title="خروج" onClick={logout}><LogOut size={16}/></button></div></header><div className="periodbar"><strong>عرض البيانات</strong><select className="field" value={period} onChange={e=>setPeriod(e.target.value as typeof period)}><option value="today">النهارده</option><option value="week">الأسبوع الحالي</option><option value="month">الشهر الحالي</option><option value="all">كل الوقت</option><option value="custom">تحديد فترة</option></select>{period==='custom'&&<><label>من <input className="field" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>إلى <input className="field" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label></>}<span className="muted">إحصائيات {brand==='homey'?'هومي':'صدفة'} <span className="period-dot">•</span> {periodLabel[period]}</span></div>{err&&<div className="notice error">{err}</div>}{notice&&<div className="notice">{notice} <button className="btn tiny secondary" onClick={()=>setNotice('')}>إغلاق</button></div>}
 {tab==='dashboard'&&<><section className="dashboard-intro"><div><span className="eyebrow"><Sparkles size={15}/> BUSINESS OVERVIEW</span><h2>كل شغلك تحت السيطرة</h2><p>أرقام واضحة، طلبات منظمة، ومتابعة أسهل لكل خطوة.</p></div><div className="intro-ornament"><ShoppingBag size={36}/></div></section><section className="cards">
 {([
  ['all','إجمالي الأوردرات',number(counts.all),ShoppingBag],
  ['new','أوردرات جديدة',number(counts.new),Package],
  ['confirmed','أوردرات مؤكدة',number(counts.confirmed),CheckCircle2],
  ['cancelled','أوردرات ملغية',number(cancelled),XCircle],
  ['delivered','المبيعات المسلّمة',money(revenue),Wallet],
  ['active','قيمة الطلبات غير الملغية',money(gross),Wallet],
 ] as const).map(([status,label,value,Icon])=><button key={label} className="stat" onClick={()=>showOrders(status)}><Icon color="var(--primary)"/><b dir="ltr">{value}</b><span>{label}</span></button>)}
 </section><section className="panel"><div className="sectionhead"><h2>آخر الطلبات</h2><button className="btn" onClick={()=>setEditing(newOrder(brand))}><Plus size={16}/> إضافة أوردر</button></div>{table(visible.slice(0,8))}</section></>}
 {tab==='orders'&&<section className="panel"><div className="sectionhead"><h2>الطلبات ({number(visible.length)})</h2><div className="toolbar"><input className="field" placeholder="ابحث بالاسم أو رقم التليفون أو المنتج" value={search} onChange={e=>{setSearch(e.target.value);setSelected([])}}/><select className="field" value={filter} onChange={e=>{setFilter(e.target.value);setSelected([])}}><option value="all">كل الحالات</option><option value="active">كل الطلبات غير الملغية</option>{statuses.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select><button className="btn secondary" onClick={()=>exportCsv(visible)}><Download size={16}/> CSV</button><button className="btn" onClick={()=>{setErr('');setEditing(newOrder(brand))}}><Plus size={16}/> أوردر جديد</button></div></div>{selectedOrders.length>0&&<div className="toolbar bulk-actions">
 <strong>{number(selectedOrders.length)} طلب محدد</strong>
 <button className="btn secondary" disabled={busy} onClick={()=>{setErr('');setBulkEditing(selectedOrders)}}><Pencil size={16}/> تعديل المحدد</button>
 <button className="btn secondary" disabled={busy} onClick={()=>preview(selectedOrders)}><Printer size={16}/> طباعة المحدد</button>
 <select className="field" aria-label="حالة الطلبات المحددة" value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as Status)}>{statuses.map(status=><option key={status} value={status}>{statusLabels[status]}</option>)}</select>
 <button className="btn secondary" disabled={busy} onClick={()=>updateOrders(selectedOrders,'confirmed')}>تأكيد المحدد</button>
 <button className="btn secondary" disabled={busy} onClick={()=>updateOrders(selectedOrders,bulkStatus)}>تطبيق الحالة</button>
 <button className="btn secondary" disabled={busy} onClick={()=>updateOrders(selectedOrders,'cancelled')}>إلغاء المحدد</button>
 <button className="btn danger" disabled={busy} onClick={()=>updateOrders(selectedOrders,'delete')}>حذف المحدد</button>
 </div>}{table(visible,true)}</section>}
 {tab==='customers'&&<section className="panel"><div className="sectionhead"><h2>العملاء ({number(activeCustomers.length)})</h2><div className="toolbar"><input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث عن عميل"/><button className="btn" onClick={()=>setEditCustomer(newCustomer(brand))}><Plus size={16}/> عميل جديد</button></div></div><table className="table"><thead><tr>{['الاسم','التليفون','أول طلب','عدد الطلبات','إجمالي المشتريات','المسلّم','الإجراءات'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{activeCustomers.map(c=><tr key={c.id}><td><strong>{c.name}</strong></td><td dir="ltr" className="numeric-value">{englishDigits(c.phone)}</td><td>{customerOrders(c.phone).length?customerOrders(c.phone).map(o=>o.createdAt.slice(0,10)).sort()[0]:'—'}</td><td className="numeric-value">{number(customerOrders(c.phone).length)}</td><td>{money(customerOrders(c.phone).reduce((v,o)=>v+totalOf(o),0))}</td><td>{money(customerOrders(c.phone).filter(o=>o.status==='delivered').reduce((v,o)=>v+totalOf(o),0))}</td><td><div className="links"><button className="btn tiny secondary" title="إنشاء بوليصة" onClick={()=>fromCustomer(c)}><Printer size={15}/> بوليصة</button><button className="btn tiny secondary" onClick={()=>setEditCustomer({...c})}><Pencil size={15}/></button><button className="btn tiny danger" onClick={()=>deleteCustomer(c)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{!activeCustomers.length&&<div className="empty">لا يوجد عملاء مسجلين</div>}</section>}
 {tab==='settings'&&<section className="panel"><h2>قاعدة بيانات Neon</h2><p className="muted">الطلبات والعملاء محفوظين في قاعدة بيانات Neon منفصلة للمشروع، مش Google Sheets. الاستضافة على Vercel. الدخول بالبريد الإلكتروني وكلمة المرور للحسابات المصرّح لها. كلمات المرور محفوظة كـ Hash في Neon، وكل الطلبات والعملاء محمية بجلسة دخول.</p><p className="muted">تقدر تصدّر الطلبات بصيغة CSV من تبويب الأوردرات. حذف الطلبات حذف منطقي قابل للاسترجاع من قاعدة البيانات.</p></section>}
 </main>
 {bulkEditing.length>0&&<div className="modalshade">
 <section className="modal" role="dialog" aria-modal="true" aria-label="تعديل الأوردرات المحددة">
 <div className="sectionhead"><h2>تعديل {number(bulkEditing.length)} أوردر</h2><button type="button" disabled={busy} className="btn secondary" onClick={()=>setBulkEditing([])}>إغلاق</button></div>
 <p className="muted">اكتب القيم اللي عايز تطبقها على كل الأوردرات المحددة. الخانات الفاضية بتحتفظ بقيمتها الحالية.</p>
 <form onSubmit={saveBulk}><div className="formgrid">
 <label>المحافظة<select className="field" name="governorate"><option value="">اختيار المحافظة</option>{govs.map(g=><option key={g}>{g}</option>)}</select></label>
 <label>طريقة الدفع<select className="field" name="paymentMethod"><option value="">اختيار طريقة الدفع</option>{['الدفع عند الاستلام','InstaPay','مدفوع بالكامل','جزئي مقدم'].map(method=><option key={method}>{method}</option>)}</select></label>
 <label>مصدر الطلب<select className="field" name="source"><option value="">اختيار المصدر</option>{['Facebook','Instagram','WhatsApp','Website','TikTok','Amazon','Other'].map(source=><option key={source}>{source}</option>)}</select></label>
 {([['city','المدينة / المنطقة'],['assignedTo','المسؤول عن المتابعة'],['notes','ملاحظات']] as const).map(([name,label])=><label key={name}>{label}<input className="field" name={name}/></label>)}
 {([['shipping','الشحن'],['discount','الخصم'],['prepaid','المدفوع مقدمًا']] as const).map(([name,label])=><label key={name}>{label}<input className="field numeric-input" name={name} type="number" step="0.01" min="0"/></label>)}
 </div>{err&&<p className="notice error" role="alert">{err}</p>}<div className="modalfooter"><button className="btn" disabled={busy}>حفظ التعديلات</button></div></form>
 </section></div>}
 {printOrders.length>0&&<div className="modalshade print-preview" onClick={e=>{if(e.target===e.currentTarget)setPrintOrders([])}}>
 <section className="modal" role="dialog" aria-modal="true" aria-label="معاينة البوالص">
 <form className="print-controls" onSubmit={e=>{e.preventDefault();window.print()}}>
 <div className="sectionhead"><h2>معاينة الطباعة ({number(printOrders.length)})</h2><button type="button" className="btn secondary" onClick={()=>setPrintOrders([])}>إغلاق</button></div>
 <div className="toolbar bulk-actions"><label>تاريخ الطباعة <input type="date" className="field" required value={printDate} onChange={e=>setPrintDate(e.target.value)}/></label><button className="btn" onClick={()=>setPdfHelp(false)}><Printer size={16}/> طباعة</button><button className="btn secondary" type="button" onClick={()=>setPdfHelp(true)}><FileDown size={16}/> حفظ PDF</button></div>
 {pdfHelp&&<p className="notice">اختار «حفظ بتنسيق PDF» كوجهة في نافذة الطباعة. <button className="btn tiny secondary" type="submit">فتح نافذة الحفظ</button></p>}
 {printOrders.length>1&&<details><summary>تاريخ مختلف لكل بوليصة</summary><div className="formgrid">{printOrders.map(o=>{const id=printable(o).id;return <label key={id}>{o.customerName}<input className="field" type="date" value={printDates[id]||printDate} onChange={e=>setPrintDates({...printDates,[id]:e.target.value||printDate})}/></label>})}</div></details>}
 </form>
 <div className="shipping-preview"><WaybillPrintSheets waybills={printOrders.map(printable)} perPage={4} printDate={printDate} printDates={printDates}/></div>
 </section></div>}
 {editing&&<div className="modalshade" onClick={e=>{if(e.target===e.currentTarget)setEditing(null)}}><section className="modal order-editor"><div className="sectionhead"><h2>{editing.id?'تعديل أوردر':'إضافة طلب جديد'} <span className="order-brand-chip">{brand==='homey'?<HomeyLogo className="editor-homey-logo"/>:'SODFA'}</span></h2><button className="btn secondary tiny" onClick={()=>setEditing(null)}>إغلاق ×</button></div><form onSubmit={saveOrder}><h3 className="editor-section-title"><Users size={19}/> بيانات العميل</h3><div className="formgrid">{inputOrder('customerName','اسم العميل',true)}{inputOrder('phone','رقم التليفون',true)}{inputOrder('alternatePhone','تليفون بديل')}{<label>تاريخ إنشاء الأوردر<input className="field" type="date" required value={editing.createdAt.slice(0,10)} onChange={e=>setEditing(x=>x?{...x,createdAt:e.target.value}:x)}/></label>}{selectOrder('governorate','المحافظة',['',...govs])}{inputOrder('city','المدينة / المنطقة')}{inputOrder('address','العنوان بالتفصيل')}{selectOrder('source','مصدر الطلب',['Facebook','Instagram','WhatsApp','Website','TikTok','Amazon','Other'])}{selectOrder('status','حالة الأوردر',statuses,statusLabels as Record<string,string>)}{selectOrder('paymentMethod','طريقة الدفع',['الدفع عند الاستلام','InstaPay','مدفوع بالكامل','جزئي مقدم'])}{inputOrder('assignedTo','المسؤول عن المتابعة')}{numOrder('shipping','الشحن (داخلي)')}{numOrder('discount','الخصم')}{numOrder('prepaid','المبلغ المدفوع مقدمًا')}<label className="full">ملاحظات الأوردر (تظهر في البوليصة عند إنشائها)<textarea className="field" rows={2} value={editing.notes} onChange={e=>setEditing({...editing,notes:e.target.value})}/></label></div><h3 className="editor-section-title"><Package size={19}/> المنتجات</h3>{brand==='homey'&&<label className="catalog-picker">اختيار منتج من كتالوج هومي (اختياري)<select className="field" defaultValue="" onChange={e=>{const index=Number(e.currentTarget.value);const item=catalog[index];if(item){setEditing({...editing,items:[...editing.items.filter(x=>x.name.trim()),{name:item.name,sku:item.sku,price:item.price,quantity:1}]})}e.currentTarget.value=''}}><option value="">ابحث واختار منتج — أو اكتب يدويًا تحت</option>{catalog.map((p,i)=><option key={i} value={i}>{p.name} — {money(p.price)}</option>)}</select>{catalogNotice&&<span className="muted">{catalogNotice}</span>}</label>}{editing.items.map((item,index)=><div className="formgrid" key={index} style={{marginBottom:10}}><ProductPicker item={item} products={products} onChange={patch=>changeItem(index,patch)}/><label>SKU (اختياري)<input className="field" value={item.sku} onChange={e=>changeItem(index,{sku:e.target.value})}/></label><label>عدد القطع<input className="field numeric-input" type="number" min="1" step="1" required value={item.quantity||''} onChange={e=>changeItem(index,{quantity:Number(e.target.value)})}/></label><label>سعر الوحدة<input className="field numeric-input" type="number" step="0.01" min="0" required value={item.price} onChange={e=>changeItem(index,{price:Number(e.target.value)})}/></label>{editing.items.length>1&&<button className="btn danger tiny" type="button" onClick={()=>setEditing({...editing,items:editing.items.filter((_,i)=>i!==index)})}>حذف المنتج</button>}</div>)}<button className="btn secondary" type="button" disabled={editing.items.length>=50} onClick={()=>setEditing({...editing,items:[...editing.items,{name:'',sku:'',quantity:1,price:0}]})}>+ إضافة منتج مختلف</button><p className="muted">إجمالي القطع: {number(editing.items.reduce((sum,item)=>sum+item.quantity,0))}</p><div className="editor-total"><div><span>إجمالي المنتجات</span><strong>{money(editing.items.reduce((v,i)=>v+i.price*i.quantity,0))}</strong></div><div><span>الشحن</span><strong>{money(editing.shipping)}</strong></div><div><span>الخصم</span><strong>{money(editing.discount)}</strong></div><div className="editor-grand"><span>إجمالي الفاتورة شامل الشحن</span><strong>{money(totalOf(editing))}</strong></div><div><span>المطلوب بعد المدفوع مقدمًا</span><strong>{money(totalOf(editing)-editing.prepaid)}</strong></div></div>{err&&<div className="notice error">{err}</div>}<div className="modalfooter"><button type="button" className="btn secondary" onClick={()=>setEditing(null)}>إلغاء</button><button type="submit" className="btn" disabled={busy}><ShieldCheck size={17}/> حفظ الطلب</button></div></form></section></div>}
 {editCustomer&&<div className="modalshade" onClick={e=>{if(e.target===e.currentTarget)setEditCustomer(null)}}><section className="modal"><h2>{editCustomer.id?'تعديل عميل':'إضافة عميل'}</h2><form onSubmit={saveCustomer}><div className="formgrid">{(['name','phone','alternatePhone','city','address','notes'] as const).map(k=><label key={k}>{({name:'الاسم',phone:'رقم التليفون',alternatePhone:'تليفون بديل',city:'المدينة',address:'العنوان',notes:'ملاحظات'})[k]}<input className="field" required={k==='name'||k==='phone'} value={editCustomer[k]} onChange={e=>setEditCustomer({...editCustomer,[k]:e.target.value})}/></label>)}<label>المحافظة<select className="field" value={editCustomer.governorate} onChange={e=>setEditCustomer({...editCustomer,governorate:e.target.value})}><option value="">اختر</option>{govs.map(g=><option key={g}>{g}</option>)}</select></label></div><div className="modalfooter"><button type="button" className="btn secondary" onClick={()=>setEditCustomer(null)}>إلغاء</button><button className="btn" disabled={busy}>حفظ العميل</button></div></form></section></div>}
 </div>;
 function changeItem(index:number,patch:Partial<Item>){if(!editing)return;setEditing({...editing,items:editing.items.map((item,i)=>i===index?{...item,...patch}:item)})}
 function inputOrder(key:keyof Order,label:string,required=false){return <label key={key}>{label}<input className="field" required={required} value={String(editing?.[key]??'')} onChange={e=>setEditing(x=>x?{...x,[key]:e.target.value}:x)}/></label>}
 function numOrder(key:'shipping'|'discount'|'prepaid',label:string){return <label key={key}>{label}<input type="number" step="0.01" min="0" className="field numeric-input" value={editing?.[key]??0} onChange={e=>setEditing(x=>x?{...x,[key]:Number(e.target.value)}:x)}/></label>}
 function selectOrder(key:'governorate'|'source'|'status'|'paymentMethod',label:string,options:readonly string[],labels?:Record<string,string>){return <label key={key}>{label}<select className="field" value={editing?.[key]??''} onChange={e=>setEditing(x=>x?{...x,[key]:e.target.value}:x)}>{options.map(v=><option value={v} key={v}>{labels?.[v]||v||'اختر'}</option>)}</select></label>}
 function table(rows:Order[],selectable=false){
 const allChecked=rows.length>0&&rows.every(o=>selected.includes(o.id));
 return <><table className="table"><thead><tr>{selectable&&<th><input type="checkbox" aria-label="تحديد كل الطلبات الظاهرة" disabled={!rows.length||busy} checked={allChecked} onChange={()=>setSelected(allChecked?[]:rows.map(o=>o.id))}/></th>}{columns.map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(o=><tr key={o.id}>{selectable&&<td><input type="checkbox" aria-label={'تحديد طلب '+o.customerName} disabled={busy} checked={selected.includes(o.id)} onChange={e=>setSelected(e.target.checked?[...selected,o.id]:selected.filter(id=>id!==o.id))}/></td>}<td><strong className="order-ref" dir="ltr">#{o.id.slice(0,8).toUpperCase()}</strong></td><td>{o.customerName}</td><td dir="ltr" className="numeric-value">{englishDigits(o.phone)}</td><td>{o.items.map(i=>i.name).join('، ').slice(0,65)}</td><td><strong>{money(totalOf(o))}</strong></td><td><span className={'pill status-'+o.status}>{statusLabels[o.status]}</span></td><td className="numeric-value">{dateEN(o.createdAt)}</td><td className="order-actions"><div className="links"><a className="btn tiny secondary" title="طباعة فاتورة PDF" href={'/orders/'+o.id+'/invoice'} target="_blank" rel="noopener noreferrer"><FileText size={15}/></a><button className="btn tiny secondary" title="طباعة البوليصة" onClick={()=>preview([o])}><Printer size={15}/> طباعة</button><button className="btn tiny secondary" title="تعديل" onClick={()=>{setErr('');setEditing({...o})}}><Pencil size={15}/></button>{o.status!=='confirmed'&&<button className="btn tiny secondary" title="تأكيد الطلب" disabled={busy} onClick={()=>updateOrders([o],'confirmed')}><CheckCircle2 size={15}/></button>}{o.status!=='cancelled'&&<button className="btn tiny secondary" title="إلغاء الطلب" disabled={busy} onClick={()=>updateOrders([o],'cancelled')}><XCircle size={15}/></button>}<button className="btn tiny danger" title="حذف" disabled={busy} onClick={()=>updateOrders([o],'delete')}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{rows.length===0&&<div className="empty">{!loaded?'جاري تحميل البيانات…':'مفيش أوردرات مطابقة حالياً. اضغط إضافة أوردر للبدء.'}</div>}</>}
}
