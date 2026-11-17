Warning: truncated output (original token count: 17395)
Total output lines: 598

'use client';
import {useTranslation,LanguageSwitch} from '@/app/language';

import {customerPrintKey,printKeys,printDocuments} from '@/lib/print-history';
import {talaExpress,talaRate} from '@/lib/tala-shipping';
import {OrderDetails} from './order-details';
import {TalaDestinationFields} from './tala-destination-fields';
import {TalaShipments} from './tala-shipments';
import {TalaSettings} from './tala-settings';
import {ShippingIntegrations} from './shipping-integrations';
import {canPrepareShipment} from '@/lib/shipping-handoff';
import {InstallApp} from './install-app';
import {OrderLocationFields} from './order-location-fields';
import {ProductPicker} from './product-picker';
import {WaybillPrintSheets} from '@/components/waybill-print-sheets';
import {useEffect,useState} from 'react';
import {LayoutDashboard,Package,Users,Settings,LogOut,Plus,Download,Trash2,Pencil,RefreshCcw,ShoppingBag,CheckCircle2,Printer,FileText,FileDown,XCircle,ArrowUpLeft,ShieldCheck,Menu,X,Truck,ChartNoAxesCombined,ChevronDown} from 'lucide-react';
import type {Brand,Order,Customer,Item,Waybill,Status} from '@/lib/types';
import {statuses,statusLabels,govs,calculatedTotal,totalOf} from '@/lib/types';
import {HomeyLogo} from '@/components/homey-logo';

import {carrierAmounts,closedWithoutDelivery,collectionFromCustomer,productRevenue,collectionLabels,collectionState,collectionStates,shippingStates,type CollectionState} from '@/lib/carrier-tracking';

type Tab='dashboard'|'orders'|'carriers'|'shipping-integrations'|'customers'|'reports'|'settings';
const newOrder=(brand:Brand):Order=>({id:'',creationRequestId:crypto.randomUUID(),brand,createdAt:new Date().toLocaleDateString('en-CA'),updatedAt:'',version:0,customerName:'',phone:'',alternatePhone:'',governorate:'',city:'',address:'',source:'',paymentMethod:'الدفع عند الاستلام',prepaid:0,shipping:0,discount:0,items:[{name:'',sku:'',quantity:1,price:0}],status:'new',notes:'',assignedTo:'',deletedAt:''});
const newCustomer=(brand:Brand):Customer=>({id:'',brand,name:'',phone:'',alternatePhone:'',governorate:'',city:'',address:'',notes:'',createdAt:'',updatedAt:'',deletedAt:''});
const englishDigits=(value:string|number)=>String(value??'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0));
const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,numberingSystem:'latn'}).format(n);
const dateEN=(date:string)=>{const d=new Date(date);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',numberingSystem:'latn'})};
const enteredDate=new Intl.DateTimeFormat('en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Africa/Cairo',numberingSystem:'latn'});
const formatEntryDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':enteredDate.format(date)};
const cairoDay=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Africa/Cairo'});
const columns=['رقم الطلب','العميل','شركة الشحن','حالة الشحن','حالة التحصيل','المستحق','المستلم','المتبقي','التليفون','العنوان','المنتجات','تاريخ الطلب','تاريخ الإدخال','الإجراءات'];
function exportCsv(rows:Order[]){const headers=['ID','Brand','Order date','Entry date','Customer','Phone','Governorate','City','Address','Items','Total','Shipping status','Carrier','Collection status','Due','Received','Remaining','Notes'];const data=rows.map(o=>[o.id,o.brand,o.createdAt,o.enteredAt||o.createdAt,o.customerName,o.phone,o.governorate,o.city,o.address,o.items.map(i=>`${i.name} × ${i.quantity}`).join(' | '),totalOf(o),statusLabels[o.status],o.shippingCompany,collectionLabels[collectionState(o)],carrierAmounts(o).due,carrierAmounts(o).received,carrierAmounts(o).remaining,o.notes]);const csv='\ufeff'+[headers,...data].map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='orders-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(a.href)}
async function api(path:string,method='GET',body?:unknown){const response=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},credentials:'same-origin',body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const json=await response.json();if(!response.ok)throw new Error(json.error||'حدث خطأ');return json}
export default function Page(){
 const t=useTranslation();
 const money=(n:number)=>number(n)+' '+t('ج.م');
 const [auth,setAuth]=useState<boolean|null>(null),[email,setEmail]=useState(''),[brand,setBrand]=useState<Brand>('homey'),[tab,setTab]=useState<Tab>('dashboard'),[orders,setOrders]=useState<Order[]>([]),[customers,setCustomers]=useState<Customer[]>([]),[waybills,setWaybills]=useState<Waybill[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[editing,setEditing]=useState<Order|null>(null),[editCustomer,setEditCustomer]=useState<Customer|null>(null),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[notice,setNotice]=useState(''),[loaded,setLoaded]=useState(false);
 const [deliveryChosen,setDeliveryChosen]=useState(false);
 const [orderLocations,setOrderLocations]=useState<Record<string,string[]>>({});
 const [orderLocationError,setOrderLocationError]=useState('');
 const [bulkLocation,setBulkLocation]=useState({governorate:'',city:''});
 async function loadOrderLocations(){
  setOrderLocationError('');
  try{setOrderLocations((await api('order-locations')).data)}
  catch(e){setOrderLocationError((e as Error).message)}
 }
 useEffect(()=>{
  if(auth)void loadOrderLocations();
 },[auth]);
 const [password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[catalog,setCatalog]=useState<{name:string;sku:string;price:number;imageUrl?:string;imageUrls?:string[]}[]>([]),[catalogNotice,setCatalogNotice]=useState('');
 const [bulkEditing,setBulkEditing]=useState<Order[]>([]);
 const [pdfHelp,setPdfHelp]=useState(false);
 const [selected,setSelected]=useState<string[]>([]);
 const [bulkStatus,setBulkStatus]=useState<Status>('preparing');
 const [printed,setPrinted]=useState<Set<string>>(new Set());
 const [unprintedOnly,setUnprintedOnly]=useState(false);
 const [printError,setPrintError]=useState('');
 const [printOrders,setPrintOrders]=useState<Order[]>([]);
 const [printDate,setPrintDate]=useState('');
 const [printDates,setPrintDates]=useState<Record<string,string>>({});

 const [collectionFilter,setCollectionFilter]=useState<CollectionState|'all'>('all');
 const [carrierFilter,setCarrierFilter]=useState('');
 const [detailOrderId,setDetailOrderId]=useState('');
 const [shipmentDraft,setShipmentDraft]=useState<{brand:Brand;company:string;ids:string[]} | null>(null);
 const [shippingCompanies,setShippingCompanies]=useState<string[]>([]);
 const [companyName,setCompanyName]=useState('');
 const [companyError,setCompanyError]=useState('');
 const [customerHistory,setCustomerHistory]=useState<Customer|null>(null);
 const [collectionEdit,setCollectionEdit]=useState<{order:Order;mode:'partial'|'paid';amount:string}|null>(null);
 const [collectionError,setCollectionError]=useState('');
 const [printCopies,setPrintCopies]=useState<1|2|3>(3);
 useEffect(()=>{
  const saved=Number(localStorage.getItem('order-print-copies:'+brand));
  setPrintCopies(saved===1||saved===2?saved:3);
 },[brand]);
 const [navigationOpen,setNavigationOpen]=useState(false);
 const [period,setPeriod]=useState<'all'|'today'|'week'|'month'|'custom'>('all'),[fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState('');
 const theme=brand==='homey'?{'--primary':'#526647','--primary-dark':'#263b32','--soft':'#f0f4ec','--accent':'#bca57c'} as React.CSSProperties:{'--primary':'#713cad','--primary-dark':'#261432','--soft':'#f4ecfc','--accent':'#b490dc'} as React.CSSProperties;
 useEffect(()=>{let active=true;async function checkSession(){try{const response=await fetch('/api/whoami',{credentials:'same-origin',cache:'no-store'});if(active){setAuth(response.ok);if(!response.ok&&response.status!==401)setErr('تعذر التحقق من تسجيل الدخول')}}catch{if(active){setAuth(false);setErr('تعذر الاتصال بالسيرفر')}}}void checkSession();return()=>{active=false}},[]);
 useEffect(()=>{if(!auth||brand!=='homey')return;let active=true;fetch('/api/catalog',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(x=>{if(active){setCatalog(Array.isArray(x.data)?x.data:[]);setCatalogNotice(x.warning||'')}}).catch(()=>{if(active)setCatalogNotice('المنتجات غير متاحة دلوقتي؛ تقدر تضيفها يدويًا')});return()=>{active=false}},[auth,brand]);
 async function reload(){setBusy(true);setErr('');try{const [a,b,c]=await Promise.all([api('orders'),api('customers'),api('waybills')]);setOrders(a.data);setCustomers(b.data);setWaybills(c.data);setLoaded(true)}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 useEffect(()=>{if(auth)void reload()},[auth]);
 useEffect(()=>{
  if(!auth||brand!=='homey')return;
  let active=true,running=false;
  const sync=async()=>{
   if(running)return;
   running=true;
   try{
    const result=await api('shipping-integrations/tala','POST',{brand:'homey',operation:'sync-orders'});
    if(active&&(result.data?.updated??0)>0){
     const latest=await api('orders');
     if(active)setOrders(latest.data);
    }
   }catch{/* Keep the dashboard usable while Tala is temporarily unavailable. */}
   finally{running=false}
  };
  void sync();
  const timer=window.setInterval(()=>void sync(),180000);
  return()=>{active=false;window.clearInterval(timer)};
 },[auth,brand]);
 useEffect(()=>{
  if(!auth)return;
  let active=true;
  api('shipping-companies').then(result=>{if(active)setShippingCompanies(result.data)})
   .catch(error=>{if(active)setCompanyError(error.message)});
  return()=>{active=false};
 },[auth]);
 async function saveShippingCompany(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  setBusy(true);setCompanyError('');
  try{
   const {data}=await api('shipping-companies','POST',{name:companyName});
   setShippingCompanies(current=>[...new Set([...current,data])]);
   setCompanyName('');setNotice(t('تم حفظ شركة الشحن:')+' '+data);
  }catch(error){setCompanyError((error as Error).message)}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  if(!auth)return;
  let active=true;
  const refreshPrintHistory=()=>api('print-history').then(result=>{if(active)setPrinted(previous=>new Set([...previous,...result.data]))}).catch(()=>{if(active)setErr('تعذر تحميل حالات الطباعة')});
  void refreshPrintHistory();
  window.addEventListener('focus',refreshPrintHistory);
  return()=>{active=false;window.removeEventListener('focus',refreshPrintHistory)};
 },[auth]);
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
 const inPeriod=(date:string)=>{if(period==='all')return true;const parsed=new Date(date);if(Number.isNaN(parsed.getTime()))return false;const d=cairoDay.format(parsed),today=new Date(cairoDay.format(new Date())+'T00:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const dt=new Date(d+'T12:00:00');if(Number.isNaN(dt.getTime()))return false;if(period==='today')return dt.toDateString()===today.toDateString();if(period==='week'){const start=new Date(today);start.setDate(today.getDate()-((today.getDay()+6)%7));return dt>=start&&dt<=new Date(today.getTime()+86400000)}if(period==='month')return dt.getFullYear()===today.getFullYear()&&dt.getMonth()===today.getMonth();return (!fromDate||d>=fromDate)&&(!toDate||d<=toDate)};
 const brandOrders=orders.filter(o=>o.brand===brand).sort((a,b)=>Date.parse(b.enteredAt||b.createdAt)-Date.parse(a.enteredAt||a.createdAt));
 const detailOrder=brandOrders.find(order=>order.id===detailOrderId);
 const talaOrders=brandOrders.filter(order=>order.shippingCompany===talaExpress);
 const talaOrderIds=new Set(talaOrders.map(order=>order.id));
 const talaTrackingOrders=new Map(talaOrders.flatMap(order=>order.talaTrackingCode?[[order.talaTrackingCode,order.id] as const]:[]));
 const canRetryTala=Boolean(editing?.id&&editing.brand==='homey'&&editing.shippingCompany===talaExpress&&editing.talaDispatchState==='review'&&!closedWithoutDelivery(editing)&&editing.status!=='delivered');
 const periodOrders=brandOrders.filter(o=>inPeriod(o.enteredAt||o.createdAt));
 const matchesCarrier=(o:Order)=>!carrierFilter||(o.shippingCompany||'')===carrierFilter;
 const visible=periodOrders.filter(o=>matchesCarrier(o)&&(collectionFilter==='all'||collectionState(o)===collectionFilter)&&(tab!=='orders'||!unprintedOnly||!printed.has('order:'+o.id))&&(filter==='all'||(filter==='active'?o.status!=='cancelled':o.status===filter))&&[o.customerName,o.phone,o.id,o.address,o.items.map(i=>i.name).join(' ')].join(' ').toLowerCase().includes(search.toLowerCase()));
 const registeredCompanies=[...shippingCompanies].sort((a,b)=>a.localeCompare(b,'ar'));
 const carrierNames=[...new Set([...registeredCompanies,...brandOrders.flatMap(o=>o.shippingCompany?[o.shippingCompany]:[])])].sort((a,b)=>a.localeCompare(b,'ar'));
 const reportOrders=periodOrders.filter(matchesCarrier);
 const totals=(rows:Order[])=>rows.reduce((acc,o)=>{
  const {due,received,remaining}=carrierAmounts(o);
  return {due:acc.due+due,received:acc.received+received,remaining:acc.remaining+remaining};
 },{due:0,received:0,remaining:0});
 const carrierGroups=new Map<string,Order[]>(carrierNames.filter(name=>!carrierFilter||carrierFilter===name).map(name=>[name,[]]));
 for(const order of reportOrders){
  const key=order.shippingCompany||'بدون شركة محددة';
  const rows=carrierGroups.get(key)??[];
  rows.push(order);
  carrierGroups.set(key,rows);
 }
 const allCustomerProfiles=new Map<string,Customer>();
 customers.filter(c=>c.brand===brand).forEach(c=>allCustomerProfiles.set(c.phone.replace(/\D/g,''),c));
 brandOrders.forEach(o=>{const key=englishDigits(o.phone).replace(/\D/g,'');if(!allCustomerProfiles.has(key))allCustomerProfiles.set(key,{id:'',brand,name:o.customerName,phone:o.phone,alternatePhone:o.alternatePhone,governorate:o.governorate,city:o.city,address:o.address,notes:'',createdAt:o.enteredAt||o.createdAt,updatedAt:o.updatedAt,deletedAt:''})});
 const activeCustomers=[...allCustomerProfiles.values()].filter(c=>(!unprintedOnly||!printed.has(customerPrintKey(c.brand,c.phone)))&&[c.name,c.phone,c.city].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 const customerOrders=(phone:string)=>orders.filter(o=>o.brand===brand&&o.phone.replace(/\D/g,'')===phone.replace(/\D/g,''));
 const periodLabel:Record<typeof period,string>={all:'كل الفترات',today:'اليوم',week:'الأسبوع الحالي',month:'الشهر الحالي',custom:'فترة مخصصة'};
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
 const shipmentCompany=selectedOrders[0]?.shippingCompany;
 const canPrepareSelection=shipmentCompany&&selectedOrders.every(order=>order.shippingCompany===shipmentCompany&&canPrepareShipment(order));
 function openShippingIntegration(company='', rows:Order[]=[]){
  setShipmentDraft({brand,company,ids:rows.filter(canPrepareShipment).map(order=>order.id)});
  setTab('shipping-integrations');
 }
 function showOrders(status='all',collection:CollectionState|'all'='all',company=''){
  setTab('orders');setFilter(status);setCollectionFilter(collection);setCarrierFilter(company);
  setSearch('');setSelected([]);setUnprintedOnly(false);
 }
 async function saveCollection(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!collectionEdit||busy)return;
  const {order,amount,mode}=collectionEdit;
  const value=Number(amount);
  const {due}=carrierAmounts(order);
  if(!amount.trim()||!Number.isFinite(value)||value<=0||(mode==='partial'?value>=due:value<due)){
   setCollectionError(mode==='partial'?'اكتب مبلغ أكبر من صفر وأقل من المستحق.':'اكتب المبلغ المستلم بالكامل.');
   return;
  }
  if(await updateOrders([order],{carrierReceived:value}))setCollectionEdit(null);
 }
 function chooseCollection(order:Order,state:CollectionState){
  if(state==='unpaid'){
   if(order.carrierReceived&&!confirm(t('تصفير المبلغ المستلم المسجّل للأوردر؟')))return;
   void updateOrders([order],{carrierReceived:0});
   return;
  }
  setErr('');setCollectionError('');
  setCollectionEdit({order,mode:state,amount:state==='paid'?String(Math.max(carrierAmounts(order).due,order.carrierReceived??0)):String(order.carrierReceived||'')});
 }
 function carrierSelect(){
  return <select className="field" aria-label={t("فلتر شركة الشحن")} value={carrierFilter} onChange={e=>{setCarrierFilter(e.target.value);setSelected([])}}>
   <option value="">{t("كل شركات الشحن")}</option>{carrierNames.map(name=><option key={name} value={name}>{t(name)}</option>)}
  </select>;
 }
 function talaFinanceSummary(rows:Order[]){
  const orders=rows.filter(order=>order.shippingCompany===talaExpress&&order.talaStatusCode);
  if(!orders.length)return null;
  const amounts=orders.reduce((sum,order)=>({
   delivery:sum.delivery+(order.talaDeliveryFees??0),
   collected:sum.collected+(order.talaCollectedAmount??0),
   pending:sum.pending+(order.talaPendingCollectionAmount??0),
   fees:sum.fees+(order.talaCollectedFees??0),
   due:sum.due+(order.talaCustomerDue??0),
  }),{delivery:0,collected:0,pending:0,fees:0,due:0});
  return <><h3>{t("المبالغ المسجلة في تالا")}</h3><div className="tracking-grid tracking-finance tala-finance-grid">
   <div className="tracking-card tala-finance-delivery"><span>{t("رسوم الشحن حسب تالا")}</span><strong>{money(amounts.delivery)}</strong></div>
   <div className="tracking-card tala-finance-collected"><span>{t("المبلغ المحصل حسب تالا")}</span><strong>{money(amounts.collected)}</strong></div>
   <div className="tracking-card tala-finance-pending"><span>{t("المبلغ قيد التحصيل حسب تالا")}</span><strong>{money(amounts.pending)}</strong></div>
   <div className="tracking-card tala-finance-fees"><span>{t("رسوم تالا المحصلة")}</span><strong>{money(amounts.fees)}</strong></div>
   <div className="tracking-card tala-finance-due"><span>{t("المستحق حسب تالا")}</span><strong>{money(amounts.due)}</strong></div>
  </div></>;
 }
 function salesSummary(rows:Order[]){
  const amounts=rows.reduce((sum,order)=>{
   if(closedWithoutDelivery(order))return sum;
   return {shipping:sum.shipping+order.shipping,products:sum.products+productRevenue(order)};
  },{shipping:0,products:0});
  return <div className="tracking-grid tracking-finance">
   <div className="tracking-card"><span>{t("إجمالي تكلفة الشحن للطلبات")}</span><strong>{money(amounts.shipping)}</strong></div>
   <div className="tracking-card"><span>{t("إجمالي قيمة المنتجات بعد فصل الشحن")}</span><strong>{money(amounts.products)}</strong></div>
  </div>;
 }
 function financeSummary(rows:Order[]){
  const amounts=totals(rows);
  return <div className="tracking-grid tracking-finance">
   <div className="tracking-card tracking-partial"><span>{t("صافي المستحق بعد خصم شحن تالا")}</span><strong>{money(amounts.due)}</strong></div>
   <div className="tracking-card tracking-paid"><span>{t("المستلم من شركات الشحن")}</span><strong>{money(amounts.received)}</strong></div>
   <div className="tracking-card tracking-unpaid"><span>{t("المتبقي")}</span><strong>{money(amounts.remaining)}</strong></div>
  </div>;
 }
 function carrierTable(){
  return <div className="tracking-table-scroll"><table className="table tracking-table">
   <thead><tr>{['شركة الشحن','لدى الشركة','تم التسليم','المرتجع','المستحق','المستلم','المتبقي'].map(label=><th key={label}>{t(label)}</th>)}</tr></thead>
   <tbody>{[...carrierGroups].map(([name,rows])=>{
    const amounts=totals(rows);
    return <tr key={name}><th scope="row">{name===t("بدون شركة محددة")?name:<button className="btn tiny secondary" onClick={()=>showOrders('all','all',name)}>{name}</button>}</th>
     <td>{number(rows.filter(o=>o.status==='shipped').length)}</td><td>{number(rows.filter(o=>o.status==='delivered').length)}</td>
     <td>{number(rows.filter(o=>o.status==='returned').length)}</td><td>{money(amounts.due)}</td><td>{money(amounts.received)}</td><td>{money(amounts.remaining)}</td></tr>;
   })}</tbody>
  </table>{!carrierGroups.size&&<div className="empty">{t("مفيش أوردرات في الفترة دي.")}</div>}</div>;
 }
 const printFilter=<label><input type="checkbox" checked={unprintedOnly} onChange={e=>{setUnprintedOnly(e.target.checked);setSelected([])}}/>{t("لم تُطبع بعد")}</label>;
 function printBadge(done:boolean){
  return <span className={'print-badge'+(done?' printed':'')}>{done?t("تم طلب الطباعة"):t("لم تُطبع بعد")}</span>;
 }
 function preview(rows:Order[]){
  setPrintError('');
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
  if(saved)return {...saved,address:o.address?.trim()||saved.address,invoiceAmount:totalOf(o),shippingCost:0,prepaid:o.prepaid,collectionAmount:collectionFromCustomer(o)};
  const invoiceAmount=totalOf(o);
  return {id:o.id||o.phone,orderId:o.id||null,customerId:null,brand:o.brand,createdAt:printDate+'T12:00:00',updatedAt:o.updatedAt,
   reference:o.id?'#'+o.id.slice(0,8).toUpperCase():'—',customerName:o.customerName,phone:o.phone,
   alternatePhone:o.alternatePhone,governorate:o…5395 tokens truncated…n><button className="btn tiny danger" onClick={()=>deleteCustomer(c)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{!activeCustomers.length&&<div className="empty">{t("لا يوجد عملاء مسجلين")}</div>}</section>}
 {tab==='settings'&&<><TalaSettings key={brand} brand={brand} orderIds={new Set(brandOrders.filter(order=>order.shippingCompany===talaExpress).map(order=>order.id))} openOrder={setDetailOrderId}/><section className="panel tracking-settings"><h2>{t("إعدادات الطباعة")}</h2><p>{t("البراند الحالي:")} {brand==='homey'?t("هومي"):t("صدفة")}</p><label>{t("عدد نسخ البوليصة لكل أوردر على ورقة A4")}
  <select className="field" value={printCopies} onChange={e=>setPrintCopies(Number(e.target.value) as 1|2|3)}>{[1,2,3].map(copies=><option key={copies} value={copies}>{copies}</option>)}</select></label>
  <button className="btn" onClick={()=>{localStorage.setItem('order-print-copies:'+brand,String(printCopies));setNotice('تم حفظ إعدادات الطباعة على الجهاز')}}>{t("حفظ الإعدادات")}</button>
 </section></>}
 </main>
 {customerHistory&&<div className="modalshade"><section className="modal tracking-history" role="dialog" aria-modal="true" aria-label={t("سجل طلبات العميل")}><div className="sectionhead"><h2>{t("طلبات")} {customerHistory.name}</h2><button className="btn secondary" onClick={()=>setCustomerHistory(null)}>{t("إغلاق")}</button></div>{table(customerOrders(customerHistory.phone))}</section></div>}
 {collectionEdit&&<div className="modalshade"><section className="modal tracking-collection" role="dialog" aria-modal="true" aria-label={t("تسجيل التحصيل")}><div className="sectionhead"><h2>{t("تسجيل التحصيل")}</h2><button className="btn secondary" disabled={busy} onClick={()=>setCollectionEdit(null)}>{t("إغلاق")}</button></div>
  <p>{collectionEdit.order.customerName}{t("· المستحق")} {money(carrierAmounts(collectionEdit.order).due)}</p>
  <form onSubmit={saveCollection}><label>{t("إجمالي المبلغ المستلم من شركة الشحن")}<input className="field numeric-input" type="number" required min="0.01" max="999999999999.99" step="0.01" value={collectionEdit.amount} onChange={e=>setCollectionEdit({...collectionEdit,amount:e.target.value})}/></label>
  {(collectionError||err)&&<div className="notice error" role="alert">{collectionError||err}</div>}<button className="btn" disabled={busy}>{t("حفظ المبلغ")}</button></form>
 </section></div>}
 {bulkEditing.length>0&&<div className="modalshade">
 <section className="modal" role="dialog" aria-modal="true" aria-label={t("تعديل الأوردرات المحددة")}>
 <div className="sectionhead"><h2>{t("تعديل")} {number(bulkEditing.length)}{t("أوردر")}</h2><button type="button" disabled={busy} className="btn secondary" onClick={()=>{setBulkEditing([]);setBulkLocation({governorate:'',city:''})}}>{t("إغلاق")}</button></div>
 <p className="muted">{t("اكتب القيم اللي عايز تطبقها على كل الأوردرات المحددة. الخانات الفاضية بتحتفظ بقيمتها الحالية.")}</p>
 <form onSubmit={saveBulk}><div className="formgrid">
 <OrderLocationFields locations={orderLocations} {...bulkLocation} onChange={(governorate,city)=>setBulkLocation({governorate,city})}/>
 <label>{t("طريقة الدفع")}<select className="field" name="paymentMethod"><option value="">{t("اختيار طريقة الدفع")}</option>{['الدفع عند الاستلام','InstaPay','مدفوع بالكامل','جزئي مقدم'].map(method=><option key={method} value={method}>{t(method)}</option>)}</select></label>
 <label>{t("مصدر الطلب")}<select className="field" name="source"><option value="">{t("اختيار المصدر")}</option>{['Facebook','Instagram','WhatsApp','Website','TikTok','Amazon','Other'].map(source=><option key={source}>{source}</option>)}</select></label>
 {([['assignedTo','المسؤول عن المتابعة'],['notes','ملاحظات']] as const).map(([name,label])=><label key={name}>{t(label)}<input className="field" name={name}/></label>)}
 {([['shipping','الشحن'],['discount','الخصم'],['prepaid','المدفوع مقدمًا']] as const).map(([name,label])=><label key={name}>{t(label)}<input className="field numeric-input" name={name} type="number" step="0.01" min="0"/></label>)}
 </div>{err&&<p className="notice error" role="alert">{t(err)}</p>}<div className="modalfooter"><button className="btn" disabled={busy}>{t("حفظ التعديلات")}</button></div></form>
 </section></div>}
 {printOrders.length>0&&<div className="modalshade print-preview" onClick={e=>{if(e.target===e.currentTarget)setPrintOrders([])}}>
 <section className="modal" role="dialog" aria-modal="true" aria-label={t("معاينة البوالص")}>
 <form className="print-controls" onSubmit={e=>{
  e.preventDefault();
  const keys=printKeys(printOrders);
  setPrintError('');
  void printDocuments(keys).then(()=>setPrinted(previous=>new Set([...previous,...keys]))).catch(()=>setPrintError('اتفتح مربع الطباعة، لكن حالة الطباعة ما اتحفظتش.'));
 }}>
 <div className="sectionhead"><h2>{t("معاينة الطباعة (")}{number(printOrders.length)})</h2><button type="button" className="btn secondary" onClick={()=>setPrintOrders([])}>{t("إغلاق")}</button></div>
 <div className="toolbar bulk-actions"><label>{t("تاريخ الطباعة")} <input type="date" className="field" required value={printDate} onChange={e=>setPrintDate(e.target.value)}/></label><button className="btn" onClick={()=>setPdfHelp(false)}><Printer size={16}/>{t("طباعة")}</button><button className="btn secondary" type="submit" onClick={()=>setPdfHelp(true)}><FileDown size={16}/>{t("حفظ PDF")}</button></div>
 {printError&&<p className="notice error" role="alert">{printError}</p>}
 {pdfHelp&&<p className="notice">{t("اختار «حفظ بتنسيق PDF» كوجهة في نافذة الطباعة.")}</p>}
 {printOrders.length>1&&<details><summary>{t("تاريخ مختلف لكل بوليصة")}</summary><div className="formgrid">{printOrders.map(o=>{const id=printable(o).id;return <label key={id}>{o.customerName}<input className="field" type="date" value={printDates[id]||printDate} onChange={e=>setPrintDates({...printDates,[id]:e.target.value||printDate})}/></label>})}</div></details>}
 </form>
 <div className="shipping-preview"><WaybillPrintSheets waybills={printOrders.map(printable)} perPage={4} printDate={printDate} printDates={printDates}/></div>
 </section></div>}
 {detailOrder&&<OrderDetails order={detailOrder} close={()=>setDetailOrderId('')}
  edit={()=>{setDetailOrderId('');setErr('');setEditing({...detailOrder})}}
  print={()=>{setDetailOrderId('');preview([detailOrder])}}
  prepare={()=>{setDetailOrderId('');openShippingIntegration(detailOrder.shippingCompany,[detailOrder])}}/>}
 {editing&&<div className="modalshade"  onClick={e=>{if(e.target===e.currentTarget)setEditing(null)}}>
  <section className="modal order-editor" role="dialog" aria-modal="true" aria-labelledby="order-editor-title">
   <div className="sectionhead">
    <h2 id="order-editor-title">{editing.id?t("تعديل أوردر"):t("إضافة طلب جديد")} <span className="order-brand-chip">{brand==='homey'?<HomeyLogo className="editor-homey-logo"/>:<img src="/sodfa-logo.png" alt={t("صدفة")} width={85} height={35}/>}</span></h2>
    <button type="button" className="btn secondary tiny" onClick={()=>setEditing(null)}>{t("إغلاق ×")}</button>
   </div>
   <form onSubmit={saveOrder}>
    <section className="order-form-section order-carrier-choice">
     <h3 className="editor-section-title"><Truck size={18}/>{t('طريقة التوصيل')}</h3>
     <label>{t("شركة الشحن")}
      <select className="field" required={!editing.id} value={editing.shippingCompany?'company:'+editing.shippingCompany:editing.id||deliveryChosen?'self':''} onChange={e=>{
       const value=e.target.value;setDeliveryChosen(true);
       changeShippingLocation({shippingCompany:value==='self'?'':value.slice('company:'.length)});
      }}>
       <option value="" disabled>{t("اختار شركة الشحن أولاً")}</option>
       {registeredCompanies.map(name=><option key={name} value={'company:'+name}>{t(name)}</option>)}
       {editing.shippingCompany&&!registeredCompanies.includes(editing.shippingCompany)&&<option value={'company:'+editing.shippingCompany}>{t(editing.shippingCompany)}</option>}
       <option value="self">{t("توصيل بنفسي")}</option>
      </select>
     </label>
    </section>
    {(editing.id||deliveryChosen)&&<>
    <section className="order-form-section">
    <h3 className="editor-section-title"><Users size={18}/>{t('العميل والعنوان')}</h3>
    <div className="formgrid order-basics">
     {inputOrder('customerName',t("اسم العميل"),true)}
     {inputOrder('phone',t("رقم التليفون"),true)}
     <OrderLocationFields locations={orderLocations} governorate={editing.governorate} city={editing.city} required={!editing.id}
       onAreaAdded={(governorate,city)=>setOrderLocations(locations=>({...locations,[governorate]:[...new Set([...(locations[governorate]??[]),city])].sort((a,b)=>a.localeCompare(b,'ar'))}))}
       onChange={(governorate,city)=>changeShippingLocation({governorate,city})}/>

     {orderLocationError&&<div className="full notice error" role="alert">{orderLocationError} <button type="button" className="btn secondary tiny" onClick={loadOrderLocations}>{t("إعادة المحاولة")}</button></div>}
     <label className="full">{t("العنوان بالتفصيل")}
      <input className="field" required={!editing.id} value={editing.address} onChange={e=>setEditing({...editing,address:e.target.value})}/>
     </label>
     {editing.brand==='homey'&&editing.shippingCompany===talaExpress&&(!editing.id||canRetryTala||(!closedWithoutDelivery(editing)&&editing.status!=='delivered'))&&
      <div className="full"><TalaDestinationFields retryOrder={canRetryTala}
       price={Math.max(0,totalOf(editing)-editing.shipping-editing.prepaid)}
       onRateChange={rate=>setEditing(order=>order?{...order,shipping:rate}:order)}/></div>}
    </div>
    </section>
    <section className="order-form-section">
    <h3 className="editor-section-title"><Truck size={18}/>{t('بيانات الشحن')}</h3>
    <div className="formgrid order-basics">
     {numOrder('shipping',t("تكلفة الشحن"))}
    </div>
    </section>
    <section className="order-form-section">
    <h3 className="editor-section-title"><Package size={19}/>{t("المنتجات")}</h3>
    {brand==='homey'&&catalogNotice&&<p className="muted">{t(catalogNotice)}</p>}
    {editing.items.map((item,index)=><div className="formgrid order-product-row" key={index}>
     <ProductPicker item={item} products={products} onChange={patch=>changeItem(index,patch)}/>
     <label>{t("الكمية")}
      <input className="field numeric-input" type="number" min="1" step="1" required value={item.quantity||''} onChange={e=>changeItem(index,{quantity:Number(e.target.value)})}/>
     </label>
      <label>{t("السعر")}<input className="field numeric-input" type="number" inputMode="decimal" aria-label={t("سعر الوحدة")} step="0.01" min="0" value={item.price} onChange={e=>changeItem(index,{price:Number(e.target.value)})}/></label>
     {editing.items.length>1&&<button className="btn danger tiny" type="button" aria-label={t("حذف المنتج ")+(index+1)} onClick={()=>setEditing({...editing,items:editing.items.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button>}
    </div>)}
    <button className="btn secondary tiny" type="button" disabled={editing.items.length>=50} onClick={()=>setEditing({...editing,items:[...editing.items,{name:'',sku:'',quantity:1,price:0}]})}>{t("+ إضافة منتج")}</button>
    </section>
    <details className="order-more">
     <summary>{t("المزيد من الخيارات")} <ChevronDown aria-hidden="true" size={18}/></summary>
     <div className="formgrid">
      {inputOrder('alternatePhone',t("تليفون بديل"))}
      <label>{t("تاريخ إنشاء الأوردر")}
       <input className="field" type="date" value={editing.createdAt.slice(0,10)} onChange={e=>{if(e.target.value)setEditing({...editing,createdAt:e.target.value})}}/>
      </label>
      {selectOrder('source',t("مصدر الطلب"),['','Facebook','Instagram','WhatsApp','Website','TikTok','Amazon','Other'])}
      {inputOrder('courier',t("المندوب"))}
      {inputOrder('assignedTo',t("المسؤول عن المتابعة"))}
      {selectOrder('status',t("حالة الأوردر"),statuses,statusLabels)}
      {selectOrder('paymentMethod',t("طريقة الدفع"),['الدفع عند الاستلام','InstaPay','مدفوع بالكامل','جزئي مقدم'])}
      {numOrder('discount',t("الخصم"))}
      {numOrder('prepaid',t("المبلغ المدفوع مقدمًا"))}
      <label className="full">{t("ملاحظات الأوردر")}
       <textarea className="field" rows={2} value={editing.notes} onChange={e=>setEditing({...editing,notes:e.target.value})}/>
      </label>
     </div>
     {editing.items.map((item,index)=><div className="formgrid order-item-details" key={index}>
      <strong className="full">{item.name||t("المنتج ")+(index+1)}</strong>
      <label>SKU<input className="field" value={item.sku} onChange={e=>changeItem(index,{sku:e.target.value})}/></label>
      <label className="full">{t("رابط صورة المنتج")}<input type="text" inputMode="url" className="field" value={item.imageUrl??''} onChange={e=>changeItem(index,{imageUrl:e.target.value})}/></label>
     </div>)}
    </details>
    <section className="order-form-section order-payment-section">
    <h3 className="editor-section-title">{t("الشحن والتحصيل")}</h3>
    <div className="editor-total order-total-compact">
     <label className="order-manual-total">
      <span>{t("السعر النهائي اللي العميل هيدفعه للمندوب (ج.م)")}</span>
      <input className="field numeric-input" type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01"
       placeholder={String(collectionFromCustomer({...editing,manualCollection:null,manualTotal:null}))}
       value={editing.manualCollection??(editing.manualTotal!=null?collectionFromCustomer(editing):'')}
       onChange={e=>{const value=e.target.value;setEditing(order=>order?{...order,manualTotal:null,manualCollection:value===''?null:Number(value)}:order)}}/>
      <small className="muted">{t("الإجمالي التلقائي شامل الشحن وبعد المدفوع مقدمًا")} {money(Math.max(0,calculatedTotal(editing)-editing.prepaid))}</small>
     </label>
     {editing.shippingCompany===talaExpress&&<div><span>{t("صافي المستحق من تالا بعد الشحن")}</span><strong>{money(carrierAmounts(editing).due)}</strong></div>}
    </div>
    </section>
    {err&&<div className="notice error" role="alert">{t(err)}</div>}
    <div className="modalfooter">
     <button type="button" className="btn secondary" onClick={()=>setEditing(null)}>{t("إلغاء")}</button>
     {canRetryTala&&<button type="submit" className="btn" value="retry-tala" disabled={busy}><Truck size={17}/>{t('حفظ وإعادة الإرسال لتالا')}</button>}
     <button type="submit" formNoValidate={canRetryTala} className={canRetryTala?'btn secondary':'btn'} disabled={busy||(!editing.id&&!deliveryChosen)}><ShieldCheck size={17}/>{t("حفظ الطلب")}</button>
    </div>
    </>}
    {!editing.id&&!deliveryChosen&&<p className="notice order-carrier-hint" role="status">{t("اختار شركة الشحن أو التوصيل الذاتي علشان تظهر خانات الطلب.")}</p>}
   </form>
  </section>
 </div>}
 {editCustomer&&<div className="modalshade" onClick={e=>{if(e.target===e.currentTarget)setEditCustomer(null)}}><section className="modal"><h2>{editCustomer.id?t("تعديل عميل"):t("إضافة عميل")}</h2><form onSubmit={saveCustomer}><div className="formgrid">{(['name','phone','alternatePhone','city','address','notes'] as const).map(k=><label key={k}>{({name:'الاسم',phone:'رقم التليفون',alternatePhone:'تليفون بديل',city:'المدينة',address:'العنوان',notes:'ملاحظات'})[k]}<input className="field" required={k==='name'||k==='phone'} value={editCustomer[k]} onChange={e=>setEditCustomer({...editCustomer,[k]:e.target.value})}/></label>)}<label>{t("المحافظة")}<select className="field" value={editCustomer.governorate} onChange={e=>setEditCustomer({...editCustomer,governorate:e.target.value})}><option value="">{t("اختر")}</option>{govs.map(g=><option key={g} value={g}>{t(g)}</option>)}</select></label></div><div className="modalfooter"><button type="button" className="btn secondary" onClick={()=>setEditCustomer(null)}>{t("إلغاء")}</button><button className="btn" disabled={busy}>{t("حفظ العميل")}</button></div></form></section></div>}
 </div>;
 function changeShippingLocation(patch:Partial<Pick<Order,'governorate'|'city'|'shippingCompany'>>){
  setEditing(order=>{
   if(!order)return order;
   const next={...order,...patch};
   if(next.shippingCompany===talaExpress){
    next.shipping=talaRate(next.shippingCompany,next.governorate,next.city)??0;
   }else if(order.shippingCompany===talaExpress){
    next.shipping=0;
   }
   return next;
  });
 }
 function changeItem(index:number,patch:Partial<Item>){if(!editing)return;setEditing({...editing,items:editing.items.map((item,i)=>i===index?{...item,...patch}:item)})}
 function inputOrder(key:keyof Order,label:string,required=false){return <label key={key}>{t(label)}<input className="field" type={key==='phone'||key==='alternatePhone'?'tel':'text'} dir={key==='phone'||key==='alternatePhone'?'ltr':undefined} maxLength={key==='courier'?120:undefined} required={required} value={String(editing?.[key]??'')} onChange={e=>setEditing(x=>x?{...x,[key]:e.target.value}:x)}/></label>}
 function numOrder(key:'shipping'|'discount'|'prepaid',label:string){return <label key={key}>{t(label)}<input type="number" step="0.01" min="0" className="field numeric-input" value={editing?.[key]??0} onChange={e=>setEditing(x=>x?{...x,[key]:Number(e.target.value)}:x)}/></label>}
 function selectOrder(key:'governorate'|'source'|'status'|'paymentMethod',label:string,options:readonly string[],labels?:Record<string,string>){return <label key={key}>{t(label)}<select className="field" value={editing?.[key]??''} onChange={e=>setEditing(x=>x?{...x,[key]:e.target.value}:x)}>{options.map(v=><option value={v} key={v}>{t(labels?.[v]||v||'اختر')}</option>)}</select></label>}
 function table(rows:Order[],selectable=false){
 const allChecked=rows.length>0&&rows.every(o=>selected.includes(o.id));
 return <div className="tracking-table-scroll" tabIndex={0} role="region" aria-label={t("جدول الأوردرات")}><table className="table tracking-table"><thead><tr>{selectable&&<th><input type="checkbox" aria-label={t("تحديد كل الطلبات الظاهرة")} disabled={!rows.length||busy} checked={allChecked} onChange={()=>setSelected(allChecked?[]:rows.map(o=>o.id))}/></th>}{columns.map(x=><th key={x}>{t(x)}</th>)}</tr></thead><tbody>{rows.map(o=><tr key={o.id}>{selectable&&<td><input type="checkbox" aria-label={t("تحديد طلب ")+o.customerName} disabled={busy} checked={selected.includes(o.id)} onChange={e=>setSelected(e.target.checked?[...selected,o.id]:selected.filter(id=>id!==o.id))}/></td>}<td><strong className="order-ref" dir="ltr">#{o.id.slice(0,8).toUpperCase()}</strong></td><td><button type="button" className="order-name-link" onClick={()=>setDetailOrderId(o.id)}>{o.customerName}</button>{o.talaStatusName&&<span className={'tala-status-badge tala-status-'+(o.talaStatusCode||'').toLowerCase()} title={t('آخر حالة مزامنة من تالا')}>{o.talaStatusName}</span>}{printBadge(printed.has('order:'+o.id))}</td><td><select className="tracking-select" aria-label={t("شركة الشحن ")+o.customerName} value={o.shippingCompany||''} disabled={busy} onChange={e=>void updateOrders([o],{shippingCompany:e.target.value})}><option value="">{t("توصيل بنفسي")}</option>{registeredCompanies.map(name=><option key={name} value={name}>{t(name)}</option>)}{o.shippingCompany&&!registeredCompanies.includes(o.shippingCompany)&&<option value={o.shippingCompany}>{t(o.shippingCompany)}</option>}</select></td>
 <td><select className={'tracking-select tracking-'+o.status} aria-label={t("حالة الشحن ")+o.customerName} value={o.status} disabled={busy} onChange={e=>void updateOrders([o],e.target.value as Status)}>{statuses.map(status=><option key={status} value={status}>{t(statusLabels[status])}</option>)}</select>{o.status==='shipped'&&<small className="tracking-awaiting-update">{t("في انتظار تحديث شركة الشحن")}</small>}</td>
 <td><select className={'tracking-select tracking-'+collectionState(o)} aria-label={t("حالة التحصيل ")+o.customerName} value={collectionState(o)} disabled={busy} onChange={e=>chooseCollection(o,e.target.value as CollectionState)}>{collectionStates.map(state=><option key={state} value={state} disabled={state==='partial'&&carrierAmounts(o).due<=0}>{t(collectionLabels[state])}</option>)}</select>{o.carrierReceived? <button className="tracking-edit-amount" disabled={busy} title={t("تعديل المبلغ المستلم")} aria-label={t("تعديل المبلغ المستلم ")+o.customerName} onClick={()=>chooseCollection(o,collectionState(o)==='partial'?'partial':'paid')}><Pencil size={13}/></button>:null}</td>
 <td>{money(carrierAmounts(o).due)}</td><td>{money(carrierAmounts(o).received)}</td><td>{money(carrierAmounts(o).remaining)}</td><td dir="ltr" className="numeric-value">{englishDigits(o.phone)}</td><td className="tracking-order-detail">{[t(o.governorate),o.city,o.address].filter(Boolean).join('، ')||'—'}</td><td className="tracking-order-detail">{o.items.map(i=>i.name+' × '+number(i.quantity)).join('، ')}</td><td className="numeric-value">{dateEN(o.createdAt)}</td><td className="numeric-value">{formatEntryDate(o.enteredAt||o.createdAt)}</td><td className="order-actions"><div className="links">{canPrepareShipment(o)&&<button className="btn tiny secondary" title={t("تجهيز ملف الشحن")} aria-label={t("تجهيز ملف الشحن")} onClick={()=>openShippingIntegration(o.shippingCompany,[o])}><Truck size={15}/></button>}<a className="btn tiny secondary" title={t("طباعة فاتورة PDF")} href={'/orders/'+o.id+'/invoice'} target="_blank" rel="noopener noreferrer"><FileText size={15}/></a><button className="btn tiny secondary" title={t("طباعة البوليصة")} onClick={()=>preview([o])}><Printer size={15}/>{t("طباعة")}</button><button className="btn tiny secondary" title={t("تعديل")} onClick={()=>{setErr('');setEditing({...o})}}><Pencil size={15}/></button>{o.status!=='confirmed'&&<button className="btn tiny secondary" title={t("تأكيد الطلب")} disabled={busy} onClick={()=>updateOrders([o],'confirmed')}><CheckCircle2 size={15}/></button>}{o.status!=='cancelled'&&<button className="btn tiny secondary" title={t("إلغاء الطلب")} disabled={busy} onClick={()=>updateOrders([o],'cancelled')}><XCircle size={15}/></button>}<button className="btn tiny danger" title={t("حذف")} disabled={busy} onClick={()=>updateOrders([o],'delete')}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{rows.length===0&&<div className="empty">{!loaded?t("جاري تحميل البيانات…"):t("مفيش أوردرات مطابقة حالياً. اضغط إضافة أوردر للبدء.")}</div>}</div>}
}
