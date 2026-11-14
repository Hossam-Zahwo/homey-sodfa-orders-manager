export const talaExpress = 'تالا إكسبريس';

const rates: Record<string, number> = {
 القاهرة: 82,
 الإسكندرية: 92, الدقهلية: 92, الغربية: 92, المنوفية: 92, 'كفر الشيخ': 92,
 دمياط: 92, الشرقية: 92, القليوبية: 92, البحيرة: 92,
 الفيوم: 112, المنيا: 112, 'بني سويف': 112, أسيوط: 112,
 سوهاج: 122, قنا: 122, الأقصر: 122, أسوان: 122,
 'جنوب سيناء': 142,
};

const gizaUrban = new Set([
 'الجيزة','الدقي','العجوزة','المهندسين','السادس من أكتوبر','الشيخ زايد','حدائق أكتوبر',
 'الهرم','فيصل','إمبابة','الوراق','بولاق الدكرور','العمرانية','المنيب','بين السرايات',
 'الكيت كات','أرض اللواء','حدائق الأهرام','القرية الذكية',
]);

const gizaOutskirts = new Set([
 'أبو النمرس','أبو رواش','أطفيح','أوسيم','الحرانية','الحوامدية','البدرشين',
 'الصف','العياط','كرداسة','كفر غطاطي','صفط اللبن','منشأة البكاري','منشأة القناطر',
]);

export function talaRate(company: string | undefined, governorate: string, city: string): number | undefined {
 if (company !== talaExpress || !city) return;
 if (governorate === 'الجيزة') {
  if (gizaUrban.has(city)) return 82;
  if (gizaOutskirts.has(city)) return 87;
  return;
 }
 return Object.hasOwn(rates, governorate) ? rates[governorate] : undefined;
}
