import {useId,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';

const searchable = (value: string) => value.normalize('NFKD')
 .replace(/\p{M}|ـ/gu, '').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();

type Props = {
 locations: Record<string, string[]>;
 governorate: string;
 city: string;
 required?: boolean;
 onChange: (governorate: string, city: string) => void;
};

export function OrderLocationFields({locations, governorate, city, required, onChange}: Props) {
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const trigger=useRef<HTMLButtonElement>(null);
 const popupId=useId();
 const governorates=Object.keys(locations).sort((a,b)=>a.localeCompare(b,'ar'));
 const cities=locations[governorate]??[];
 const options=city&&!cities.includes(city)?[city,...cities]:cities;
 const matches=options.filter(name=>searchable(name).includes(searchable(query)));
 const cityRequired=Boolean(governorate&&(required||cities.length));
 return <>
  <label>المحافظة
   <select className="field" name="governorate" required={required} value={governorate} onChange={e=>{
    setOpen(false);setQuery('');onChange(e.target.value,'');
   }}>
    <option value="">اختار المحافظة</option>
    {governorate&&!governorates.includes(governorate)&&<option value={governorate}>{governorate} (مسجلة سابقًا)</option>}
    {governorates.map(name=><option key={name}>{name}</option>)}
   </select>
  </label>
  <div className="order-city-fields" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}
   onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus()}}}>
   <span>المدينة / المنطقة</span>
   <button type="button" className="field city-trigger" ref={trigger} disabled={!governorate} aria-label={'المدينة / المنطقة: '+(city||'اختار المدينة')}
    aria-expanded={open} aria-controls={open?popupId:undefined} onClick={()=>{setQuery('');setOpen(!open)}}>
    <span>{city||(governorate?'اختار المدينة / المنطقة':'اختار المحافظة الأول')}</span><ChevronDown size={16} aria-hidden="true"/>
   </button>
   <input type="hidden" name="city" value={city}/>
   <input className="city-validation" tabIndex={-1} aria-hidden="true" required={cityRequired} value={city} onChange={()=>{}}
    onInvalid={e=>{e.preventDefault();setQuery('');setOpen(true);trigger.current?.focus()}}/>
   {open&&<div className="city-popup" id={popupId}>
    <input autoFocus className="field" type="search" aria-label="ابحث عن مدينة أو منطقة" placeholder="ابحث بالاسم" value={query}
     onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} onChange={e=>setQuery(e.target.value)}/>
    <div className="city-results" role="group" aria-label="المدن والمناطق">
     {matches.map(name=><button key={name} type="button" aria-pressed={city===name} onClick={()=>{
      onChange(governorate,name);setOpen(false);trigger.current?.focus();
     }}>{name}</button>)}
     {matches.length===0&&<small className="muted" role="status">مفيش نتائج مطابقة</small>}
    </div>
   </div>}
  </div>
 </>;
}
