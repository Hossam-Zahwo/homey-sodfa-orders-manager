type Props = {
 locations: Record<string, string[]>;
 governorate: string;
 city: string;
 required?: boolean;
 onChange: (governorate: string, city: string) => void;
};

export function OrderLocationFields({locations, governorate, city, required, onChange}: Props) {
 const governorates = Object.keys(locations).sort((a, b) => a.localeCompare(b, 'ar'));
 const cities = locations[governorate] ?? [];
 return (
  <>
   <label>المحافظة
    <select className="field" name="governorate" required={required} value={governorate} onChange={e => onChange(e.target.value, '')}>
     <option value="">اختار المحافظة</option>
     {governorate && !governorates.includes(governorate) && <option value={governorate}>{governorate} (مسجلة سابقًا)</option>}
     {governorates.map(name => <option key={name}>{name}</option>)}
    </select>
   </label>
   <label>المدينة / المنطقة
    <select className="field" name="city" required={required || Boolean(governorate && cities.length)} disabled={!governorate} value={city} onChange={e => onChange(governorate, e.target.value)}>
     <option value="">{governorate ? 'اختار المدينة / المنطقة' : 'اختار المحافظة الأول'}</option>
     {city && !cities.includes(city) && <option value={city}>{city} (مسجلة سابقًا)</option>}
     {cities.map(name => <option key={name}>{name}</option>)}
    </select>
   </label>
  </>
 );
}
