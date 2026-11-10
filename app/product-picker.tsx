'use client';

import {useState} from 'react';
import {Package} from 'lucide-react';
import type {Item} from '@/lib/types';

export function ProductPicker({item,products,onChange}:{item:Item;products:Item[];onChange:(patch:Partial<Item>)=>void}){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [manual,setManual]=useState(false);
 const matches=products.filter(product=>[product.name,product.sku].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 function thumbnail(url?:string){
  return url&&/^https?:\/\//i.test(url)
   ? <img src={url} alt="" referrerPolicy="no-referrer" loading="lazy"/>
   : <Package aria-hidden="true"/>;
 }
 return <div className="full">
  <span className="muted">المنتج</span>
  {item.name&&!manual&&<div className="product-option">{thumbnail(item.imageUrl)}<span title={item.name}>{item.name}</span></div>}
  <div className="toolbar">
   <button type="button" className="btn tiny secondary" aria-expanded={open} onClick={()=>{setOpen(!open);setQuery('')}}>{item.name?'اختيار منتج تاني':'ابحث عن منتج'}</button>
   <button type="button" className="btn tiny secondary" onClick={()=>{setManual(!manual);setOpen(false)}}>{manual?'إغلاق التعديل اليدوي':item.name?'تعديل بيانات المنتج':'إدخال منتج يدويًا'}</button>
  </div>
  {(manual||!item.name)&&<input type="text" className="field" placeholder="اسم المنتج" aria-label="اسم المنتج" required value={item.name} onFocus={()=>{if(!manual)setOpen(true)}} onChange={e=>{setManual(true);onChange({name:e.target.value,imageUrl:undefined})}}/>}
  {open&&<>
   <input className="field" aria-label="بحث عن منتج" placeholder="ابحث بالاسم أو SKU" value={query} onChange={e=>setQuery(e.target.value)}/>
   <div className="product-results">
    {matches.slice(0,20).map(product=><button key={product.sku+'|'+product.name} type="button" className="btn secondary product-option" title={product.name} onClick={()=>{
     onChange({name:product.name,sku:product.sku,price:product.price,imageUrl:product.imageUrl});
     setOpen(false);setManual(false);
    }}>{thumbnail(product.imageUrl)}<span>{product.name}</span></button>)}
    {!matches.length&&<small className="muted">مفيش نتائج مطابقة. تقدر تدخل اسم المنتج يدويًا.</small>}
   </div>
  </>}
  {manual&&<label>رابط صورة المنتج (اختياري)<input type="url" className="field" value={item.imageUrl??''} onChange={e=>onChange({imageUrl:e.target.value})}/></label>}
 </div>;
}
