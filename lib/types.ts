export type Brand = 'homey' | 'sodfa';
export type Status = 'new'|'contacted'|'confirmed'|'preparing'|'shipped'|'delivered'|'cancelled'|'returned';
export type Item = {name:string; sku:string; quantity:number; price:number};
export type Order = {id:string; brand:Brand; createdAt:string; updatedAt:string; version:number; customerName:string; phone:string; alternatePhone:string; governorate:string; city:string; address:string; source:string; paymentMethod:string; prepaid:number; shipping:number; discount:number; items:Item[]; status:Status; notes:string; assignedTo:string; deletedAt:string;};
export type Customer = {id:string; brand:Brand; name:string; phone:string; alternatePhone:string; governorate:string; city:string; address:string; notes:string; createdAt:string; updatedAt:string; deletedAt:string};
export const statuses:Status[]=['new','contacted','confirmed','preparing','shipped','delivered','cancelled','returned'];
export const statusLabels:Record<Status,string>={new:'جديد',contacted:'تم التواصل',confirmed:'مؤكد',preparing:'تجهيز',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغي',returned:'مرتجع'};
export const govs=['القاهرة','الجيزة','الإسكندرية','القليوبية','البحيرة','مطروح','الدقهلية','الغربية','المنوفية','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الشرقية','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','شمال سيناء','جنوب سيناء'];
export const totalOf=(o:Order)=>o.items.reduce((s,i)=>s+i.price*i.quantity,0)+o.shipping-o.discount;

export type Waybill={
 id:string;brand:Brand;customerId:string|null;orderId:string|null;createdAt:string;updatedAt:string;
 customerName:string;phone:string;alternatePhone:string;governorate:string;city:string;address:string;
 invoiceAmount:number;shippingCost:number;prepaid:number;collectionAmount:number;
 paymentMethod:string;description:string;notes:string;reference:string;
};
export type WaybillDraft=Omit<Waybill,'id'|'createdAt'|'updatedAt'|'collectionAmount'|'reference'>;
