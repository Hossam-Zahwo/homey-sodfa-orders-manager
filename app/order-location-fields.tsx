import {useState} from 'react';

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
 const [search, setSearch] = useState({governorate: '', text: ''});
 const query = search.governorate === governorate ? search.text : '';
 const governorates = Object.keys(locations).sort((a, b) => a.localeCompare(b, 'ar'));
 const cities = locations[governorate] ?? [];
 const filteredCities = cities.filter(name => name === city || searchable(name).includes(searchable(query)));
 return (
  <>
   <label>المحافظة
    <select className="field" name="governorate" required={required} value={governorate} onChange={e => {setSearch({governorate: '', text: ''});onChange(e.target.value, '');}}>
     <option value="">اختار المحافظة</option>
     {governorate && !governorates.includes(governorate) && <option value={governorate}>{governorate} (مسجلة سابقًا)</option>}
     {governorates.map(name => <option key={name}>{name}</option>)}
    </select>
   </label>
   <div className="order-city-fields">
    <label>ابحث عن مدينة أو منطقة
     <input className="field" type="search" placeholder="اكتب جزء من الاسم" disabled={!governorate} value={query}
      onChange={e => setSearch({governorate, text: e.target.value})}/>
    </label>
    <label>المدينة / المنطقة
     <select className="field" name="city" required={required || Boolean(governorate && cities.length)} disabled={!governorate} value={city}
      onChange={e => {onChange(governorate, e.target.value);setSearch({governorate, text: ''});}}>
      <option value="">{governorate ? 'اختار المدينة / المنطقة' : 'اختار المحافظة الأول'}</option>
      {city && !cities.includes(city) && <option value={city}>{city} (مسجلة سابقًا)</option>}
      {filteredCities.map(name => <option key={name}>{name}</option>)}
     </select>
    </label>
    {query && !cities.some(name => searchable(name).includes(searchable(query))) && <small className="muted" role="status">مفيش نتائج مطابقة</small>}
   </div>
  </>
 );
}
