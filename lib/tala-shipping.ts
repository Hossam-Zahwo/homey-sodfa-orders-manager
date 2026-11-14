export const talaExpress = 'تالا إكسبريس';

const rates: Record<string, number> = {
 القاهرة: 82,
 الإسكندرية: 142, مطروح: 142, 'جنوب سيناء': 142,
 الدقهلية: 92, الغربية: 92, المنوفية: 92, 'كفر الشيخ': 92, دمياط: 92,
 الشرقية: 92, القليوبية: 92, البحيرة: 92,
 الفيوم: 112, المنيا: 112, 'بني سويف': 112, أسيوط: 112,
 سوهاج: 122, قنا: 122, الأقصر: 122, أسوان: 122,
};

const giza82 = new Set(['الجيزة','الدقي','العجوزة','المهندسين','السادس من أكتوبر','الشيخ زايد','حدائق أكتوبر']);

export function talaRate(company: string | undefined, governorate: string, city: string): number | undefined {
 if (company !== talaExpress || !city) return;
 if (governorate === 'الجيزة') return giza82.has(city) ? 82 : undefined;
 return Object.hasOwn(rates, governorate) ? rates[governorate] : undefined;
}
