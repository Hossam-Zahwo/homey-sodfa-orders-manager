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

export function carrierAmounts(order:Order){
 const received=order.carrierReceived??0;
 const deductedShipping=order.shippingCompany===talaExpress?order.shipping:0;
 const due=closedWithoutDelivery(order)?0:Math.max(0,roundMoney(collectionFromCustomer(order)-deductedShipping));
 return {due,received,remaining:Math.max(0,roundMoney(due-received))};
}

export function collectionState(order:Order):CollectionState{
 const {received,remaining}=carrierAmounts(order);
 if(received>0)return remaining>0?'partial':'paid';
 return 'unpaid';
}
