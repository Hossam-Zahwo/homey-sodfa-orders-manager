import {totalOf,type Order,type Status} from './types';

export const shippingStates:Status[]=['shipped','delivered','postponed','cancelled','refused','returned'];
export const collectionLabels={
 unpaid:'لم يتم التحصيل',
 partial:'تحصيل جزئي',
 paid:'تم التحصيل بالكامل',
} as const;
export type CollectionState=keyof typeof collectionLabels;
export const collectionStates:CollectionState[]=['unpaid','partial','paid'];

const roundMoney=(amount:number)=>Math.round(amount*100)/100;

export function carrierAmounts(order:Order){
 const received=order.carrierReceived??0;
 const closedWithoutDelivery=['cancelled','refused','returned'].includes(order.status);
 const due=closedWithoutDelivery?0:Math.max(0,roundMoney(totalOf(order)-order.prepaid));
 return {due,received,remaining:Math.max(0,roundMoney(due-received))};
}

export function collectionState(order:Order):CollectionState{
 const {received,remaining}=carrierAmounts(order);
 if(received>0)return remaining>0?'partial':'paid';
 return 'unpaid';
}
