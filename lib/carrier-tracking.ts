import {totalOf,type Order,type Status} from './types';

import {talaExpress} from './tala-shipping';

export const shippingStates:Status[]=['shipped','delivered','postponed','cancelled','refused','returned'];
export const collectionLabels={
 unpaid:'لم يتم التحصيل',
 partial:'تحصيل جزئي',
 paid:'تم التحصيل بالكامل',
} as const;
export type CollectionState=keyof typeof collectionLabels;
export const collectionStates:CollectionState[]=['unpaid','partial','paid'];

const roundMoney=(amount:number)=>Math.round(amount*100)/100;

export const collectionFromCustomer=(o:Order)=>o.manualCollection??Math.max(0,roundMoney(totalOf(o)-o.prepaid));
export const productRevenue=(o:Order)=>roundMoney(totalOf(o)-o.shipping);
export const closedWithoutDelivery=(o:Order)=>['cancelled','refused','returned'].includes(o.status);

// Prefer Tala's synced settlement figures to an order's manually entered
// shipping cost. Never mistake a COD total for the carrier's delivery fee.
export function carrierAmounts(order:Order){
 const received=order.carrierReceived??0;
 const isTala=order.shippingCompany===talaExpress;
 const providerDue=isTala&&order.status==='delivered'&&order.talaCustomerDue!=null
  ?order.talaCustomerDue:null;
 const shippingFee=isTala?(order.talaDeliveryFees??order.shipping):0;
 const due=closedWithoutDelivery(order)?0:providerDue!=null
  ?Math.max(0,roundMoney(providerDue))
  :Math.max(0,roundMoney(collectionFromCustomer(order)-shippingFee));
 return {due,received,remaining:Math.max(0,roundMoney(due-received))};
}

// Missing prices and conflicting shipping costs are exceptions, not zero-value sales.
export function financialWarnings(order:Order):string[]{
 const warnings:string[]=[];
 const collection=collectionFromCustomer(order);
 const subtotal=order.items.reduce((sum,item)=>sum+item.price*item.quantity,0);
 if(order.items.length>0&&subtotal===0&&collection>0)
  warnings.push('أسعار المنتجات صفر في السجل رغم وجود مبلغ تحصيل منفصل');
 if(order.shippingCompany===talaExpress){
  if(order.manualCollection!=null&&order.manualCollection>0&&order.shipping>=order.manualCollection)
   warnings.push('رسوم الشحن المدخلة تساوي أو تتجاوز تحصيل العميل؛ استخدم رسوم تالا المزامنة');
  if(order.status==='delivered'&&order.talaStatusCode&&order.talaCustomerDue==null)
   warnings.push('تالا سجلت التسليم لكن صافي المستحق من تالا غير متاح');
  if(order.status==='delivered'&&collection===0)
   warnings.push('الطلب مسلّم لكن قيمة التحصيل صفر أو غير مدخلة');
 }
 return warnings;
}

export function missingFinancialAmount(order:Order):boolean{
 return order.status==='delivered'&&collectionFromCustomer(order)===0
  &&order.items.length>0&&order.items.some(item=>item.name.trim().length>0);
}

export function collectionState(order:Order):CollectionState{
 const {received,remaining}=carrierAmounts(order);
 if(received>0)return remaining>0?'partial':'paid';
 return 'unpaid';
}
