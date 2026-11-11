import React, { useEffect, useId, useRef, useState } from 'react';
import { api } from '../../services/api';
import { UserAddress } from '../../types';

type Option = { code: string; name: string };
type ZipOption = { code: string; area: string };
const alphabetic = new Intl.Collator('en-PH', { numeric: true, sensitivity: 'base' });
const sortOptions = (options: Option[]) => [...options].sort((a, b) => alphabetic.compare(a.name, b.name));
export const emptyAddress: UserAddress = { houseUnitStreet: '', municipality: '', maritalStatus: 'Single', zipCode: '', regionCode: '', provinceCode: '', cityCode: '', barangayCode: '', houseNumber: '', streetName: '', subdivision: '' };
export function addressFromSaved(summary = '', details?: Partial<UserAddress> | null): UserAddress {
  return { ...emptyAddress, houseUnitStreet: summary, municipality: '', ...(details || {}) };
}
export function formatAddress(value: UserAddress): string {
  return value.completeAddress || [value.houseNumber, value.streetName, value.subdivision, value.barangay, value.municipality, value.province, value.region, value.zipCode].filter(Boolean).join(', ') || value.houseUnitStreet;
}

function withAddressSummary(a: UserAddress): UserAddress {
  return {
    ...a,
    houseUnitStreet: [a.houseNumber, a.streetName, a.subdivision, a.barangay].filter(Boolean).join(', '),
    completeAddress: [a.houseNumber, a.streetName, a.subdivision, a.barangay, a.municipality, a.province, a.region, a.zipCode].filter(Boolean).join(', '),
  };
}

export function AddressFields({ value, onChange, className = '', legend = 'Residential address', required = true, requireHouseNumberAndStreet = true }: { value: UserAddress; onChange: (a: UserAddress) => void; className?: string; legend?: string; required?: boolean; requireHouseNumberAndStreet?: boolean }) {
  const [regions, setRegions] = useState<Option[]>([]), [provinces, setProvinces] = useState<Option[]>([]), [cities, setCities] = useState<Option[]>([]), [barangays, setBarangays] = useState<Option[]>([]), [zips, setZips] = useState<ZipOption[]>([]), [loading, setLoading] = useState(false), [zipLoading, setZipLoading] = useState(false), [error, setError] = useState(''), [zipError, setZipError] = useState(''), [retry, setRetry] = useState(0);
  const zipListId = useId();
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.geography('regions'),
      value.regionCode ? api.geography('provinces', value.regionCode) : [],
      value.regionCode ? api.geography('cities', value.provinceCode || value.regionCode) : [],
      value.cityCode ? api.geography('barangays', value.cityCode) : [],
    ]).then(([r, p, c, b]) => {
      if (active) { setRegions(sortOptions(r)); setProvinces(sortOptions(p)); setCities(sortOptions(c)); setBarangays(sortOptions(b)); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [value.regionCode, value.provinceCode, value.cityCode, retry]);

  useEffect(() => {
    let active = true;
    setZips([]);
    setZipError('');
    setZipLoading(!!value.cityCode);
    if (!value.cityCode) return () => { active = false; };
    api.geography('zips', value.cityCode, value.barangayCode || '').then((options: ZipOption[]) => {
      if (!active) return;
      setZips([...options].sort((a, b) => alphabetic.compare(a.area, b.area) || alphabetic.compare(a.code, b.code)));
      const current = latest.current;
      if (options.length === 1 && !current.value.zipCode) {
        current.onChange(withAddressSummary({ ...current.value, zipCode: options[0].code }));
      }
    }).catch(() => { if (active) setZipError('Could not look up a ZIP code. Enter it manually or retry.'); }).finally(() => { if (active) setZipLoading(false); });
    return () => { active = false; };
  }, [value.cityCode, value.barangayCode, retry]);

  const update = (patch: Partial<UserAddress>) => onChange(withAddressSummary({ ...value, ...patch }));
  const select = (label: string, options: Option[], code: string, onSelect: (o: Option) => void, fieldRequired = required) => <label className="block text-xs"><span className="block min-h-8">{label}</span><select aria-label={label} className={`${className} mt-1`} required={fieldRequired} disabled={loading} value={code || ''} onChange={e => onSelect(options.find(x => x.code === e.target.value) || { code: '', name: '' })}><option value="">{fieldRequired ? 'Select...' : 'No province / independent city'}</option>{options.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</select></label>;

  return <fieldset className="space-y-3">
    <legend className="mb-2 text-sm font-semibold">{legend}</legend>
    {value.houseUnitStreet && !value.regionCode && <p className="text-xs">Existing address: {[value.houseUnitStreet, value.municipality].filter(Boolean).join(', ')}. Select the address below to change it.</p>}
    {loading && <p role="status" className="text-xs">Loading Philippine geographic data...</p>}
    {error && <p role="alert" className="text-sm text-rose-400">Address data could not load. <button type="button" className="underline" onClick={() => setRetry(x => x + 1)}>Retry</button></p>}
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {select('Region', regions, value.regionCode, o => update({ regionCode: o.code, region: o.name, provinceCode: '', province: '', cityCode: '', municipality: '', barangayCode: '', barangay: '', zipCode: '' }))}
      {provinces.length > 0 ? select('Province / administrative division', provinces, value.provinceCode, o => update({ provinceCode: o.code, province: o.name, cityCode: '', municipality: '', barangayCode: '', barangay: '', zipCode: '' }), false) : <p className="self-end py-3 text-xs">Province: not applicable for NCR or independent cities.</p>}
      {select('City / Municipality / Manila district', cities, value.cityCode, o => update({ cityCode: o.code, municipality: o.name, barangayCode: '', barangay: '', zipCode: '' }))}
      {select('Barangay', barangays, value.barangayCode, o => update({ barangayCode: o.code, barangay: o.name, zipCode: '' }))}
      {(['houseNumber', 'streetName', 'subdivision'] as const).map((key, i) => {
        const optionalLine = !required || (!requireHouseNumberAndStreet && key !== 'subdivision');
        const labels = ['House Number / Building Number', 'Street Name', 'Subdivision / Village'];
        const fieldRequired = required && key !== 'subdivision' && (requireHouseNumberAndStreet || (key !== 'houseNumber' && key !== 'streetName'));
        return <label className="flex flex-col text-xs" key={key}><span className="min-h-8">{labels[i]}{optionalLine ? ' (optional)' : ''}</span><input required={fieldRequired} maxLength={200} className={`${className} mt-1`} value={value[key] || ''} onChange={e => update({ [key]: e.target.value })} /></label>;
      })}
      <label className="block text-xs"><span className="block min-h-8">Postal / ZIP Code</span>
        <input required={required} aria-describedby={`${zipListId}-help`} inputMode="numeric" maxLength={4} pattern="[0-9]{4}" list={zipListId} className={`${className} mt-1`} value={value.zipCode || ''} onChange={e => update({ zipCode: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        <datalist id={zipListId}>{zips.map(x => <option key={x.code} value={x.code}>{x.area}</option>)}</datalist>
        <span id={`${zipListId}-help`} className="mt-1 block" aria-live="polite">{zipLoading ? 'Looking up your ZIP code...' : zipError || (!value.cityCode ? 'Select your city/municipality and barangay to fill your ZIP code automatically.' : zips.length === 1 ? 'ZIP code filled automatically for your selected area. You can correct it if needed.' : zips.length > 1 ? 'This area has multiple ZIP codes. Select a suggestion or enter your four-digit ZIP code.' : 'No matching ZIP code is available. Enter your four-digit ZIP code manually.')}</span>
        {zipError && <button type="button" className="underline" onClick={() => setRetry(x => x + 1)}>Retry ZIP lookup</button>}
      </label>
    </div>
  </fieldset>;
}
