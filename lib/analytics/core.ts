/**
 * AI Analytics foundation — deterministic, read-only calculations.
 * No database access, credentials, AI calls or production side effects.
 * Monetary amounts are EGP. Missing costs must never be treated as zero profit deductions.
 */
export type AnalyticsBrand = 'homey' | 'sodfa';
export type AnalyticsOrder = {
  id: string; brand: AnalyticsBrand; createdAt: string;
  grossRevenue: number | null; discount: number | null;
  productCost: number | null; shippingCost: number | null;
  advertisingCostAllocated: number | null; refundedAmount: number | null;
  status: 'delivered' | 'returned' | 'cancelled' | 'pending' | 'other';
};
export type MarketingDaily = {
  provider: 'meta' | 'google_ads' | 'tiktok' | 'organic' | 'other';
  accountId: string; campaignId: string; date: string; currency: string;
  spend: number | null; impressions: number | null; clicks: number | null;
  attributedOrders: number | null; attributedRevenue: number | null;
};
export type WebsiteDaily = {
  hostname: string; date: string; sessions: number | null;
  productViews: number | null; addToCarts: number | null;
  checkoutStarts: number | null; completedOrders: number | null;
};
export type AnalyticsResult = {
  orderCount: number; deliveredCount: number; returnedCount: number;
  confirmedRevenue: number; knownCost: number; knownNetContribution: number | null;
  incompleteCostOrders: number; returnRate: number | null;
  warnings: string[];
};
const valid = (n: number | null): n is number => n !== null && Number.isFinite(n);
const sum = (values: number[]) => values.reduce((a,b)=>a+b,0);
export function summarizeOrders(orders: readonly AnalyticsOrder[]): AnalyticsResult {
  const unique = new Map<string,AnalyticsOrder>();
  const warnings: string[] = [];
  for (const row of orders) {
    if (!row.id || !row.brand) { warnings.push('Order without stable ID/brand excluded'); continue; }
    const key = row.brand + ':' + row.id;
    if (unique.has(key)) warnings.push('Duplicate order excluded: ' + key);
    else unique.set(key,row);
  }
  const records=[...unique.values()];
  const delivered=records.filter(o=>o.status==='delivered');
  const returned=records.filter(o=>o.status==='returned');
  const settled=records.filter(o=>o.status==='delivered'||o.status==='returned');
  const confirmedRevenue=sum(delivered.map(o=>valid(o.grossRevenue)?Math.max(0,o.grossRevenue)-Math.max(0,o.discount??0)-Math.max(0,o.refundedAmount??0):0));
  const knownCost=sum(delivered.flatMap(o=>[o.productCost,o.shippingCost,o.advertisingCostAllocated].filter(valid)));
  const incompleteCostOrders=delivered.filter(o=>![o.grossRevenue,o.productCost,o.shippingCost,o.advertisingCostAllocated,o.refundedAmount,o.discount].every(valid)).length;
  if(incompleteCostOrders) warnings.push('Net contribution unavailable: missing financial fields for '+incompleteCostOrders+' delivered orders');
  return {
    orderCount:records.length, deliveredCount:delivered.length,returnedCount:returned.length,
    confirmedRevenue, knownCost,
    knownNetContribution:incompleteCostOrders?null:confirmedRevenue-knownCost,
    incompleteCostOrders,
    returnRate:settled.length?returned.length/settled.length:null,
    warnings
  };
}
export function summarizeMarketing(rows: readonly MarketingDaily[]) {
  const validRows=rows.filter(r=>r.currency==='EGP');
  const spend=validRows.every(r=>valid(r.spend))?sum(validRows.map(r=>r.spend!)):null;
  const attributedRevenue=validRows.every(r=>valid(r.attributedRevenue))?sum(validRows.map(r=>r.attributedRevenue!)):null;
  return {
    spend,attributedRevenue,roas:spend!==null&&spend>0&&attributedRevenue!==null?attributedRevenue/spend:null,
    excludedOtherCurrency:rows.length-validRows.length,
    warning:'Provider-attributed revenue may overlap across platforms; do not add it to order revenue.'
  };
}
export function summarizeWebsite(rows: readonly WebsiteDaily[]) {
  const sessions=rows.every(r=>valid(r.sessions))?sum(rows.map(r=>r.sessions!)):null;
  const orders=rows.every(r=>valid(r.completedOrders))?sum(rows.map(r=>r.completedOrders!)):null;
  return {sessions,orders,conversionRate:sessions!==null&&sessions>0&&orders!==null?orders/sessions:null};
}
