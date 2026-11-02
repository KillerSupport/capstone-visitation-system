import React, { useEffect, useId, useRef, useState } from 'react';
import { api } from '../../services/api';
import { UserAddress } from '../../types';

type Option = { code: string; name: string };
type ZipOption = { code: string; area: string };
export const emptyAddress: UserAddress = { houseUnitStreet: '', municipality: '', maritalStatus: 'Single', zipCode: '', regionCode: '', provinceCode: '', cityCode: '', barangayCode: '', houseNumber: '', streetName: '', subdivision: '' };

function withAddressSummary(a: UserAddress): UserAddress {
  return {
    ...a,
    houseUnitStreet: [a.houseNumber, a.streetName, a.subdivision, a.barangay].filter(Boolean).join(', '),
    completeAddress: [a.houseNumber, a.streetName, a.subdivision, a.barangay, a.municipality, a.province, a.region, a.zipCode].filter(Boolean).join(', '),
  };
}

export function AddressFields({ value, onChange, className = '' }: { value: UserAddress; onChange: (a: UserAddress) => void; className?: string }) {
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
      if (active) { setRegions(r); setProvinces(p); setCities(c); setBarangays(b); }
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
      setZips(options);
      const current = latest.current;
      if (options.length === 1 && !current.value.zipCode) {
        current.onChange(withAddressSummary({ ...current.value, zipCode: options[0].code }));
      }
    }).catch(() => { if (active) setZipError('Could not look up a ZIP code. Enter it manually or retry.'); }).finally(() => { if (active) setZipLoading(false); });
    return () => { active = false; };
  }, [value.cityCode, value.barangayCode, retry]);

  const update = (patch: Partial<UserAddress>) => onChange(withAddressSummary({ ...value, ...patch }));
  const select = (label: string, options: Option[], code: string, onSelect: (o: Option) => void, required = true) => <label className="block text-xs">{label}<select aria-label={label} className={`${className} mt-1`} required={required} disabled={loading} value={code || ''} onChange={e => onSelect(options.find(x => x.code === e.target.value) || { code: '', name: '' })}><option value="">{required ? 'Select...' : 'No province / independent city'}</option>{options.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</select></label>;

  return <fieldset className="space-y-3">
    <legend className="mb-2 text-sm font-semibold">Residential address</legend>
    {value.houseUnitStreet && !value.regionCode && <p className="text-xs">Existing address: {value.houseUnitStreet}, {value.municipality}. Select the address below to change it.</p>}
    {loading && <p role="status" className="text-xs">Loading Philippine geographic data...</p>}
    {error && <p role="alert" className="text-sm text-rose-400">Address data could not load. <button type="button" className="underline" onClick={() => setRetry(x => x + 1)}>Retry</button></p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {select('Region', regions, value.regionCode, o => update({ regionCode: o.code, region: o.name, provinceCode: '', province: '', cityCode: '', municipality: '', barangayCode: '', barangay: '', zipCode: '' }))}
      {provinces.length > 0 ? select('Province / administrative division', provinces, value.provinceCode, o => update({ provinceCode: o.code, province: o.name, cityCode: '', municipality: '', barangayCode: '', barangay: '', zipCode: '' }), false) : <p className="self-end py-3 text-xs">Province: not applicable for NCR or independent cities.</p>}
      {select('City / Municipality / Manila district', cities, value.cityCode, o => update({ cityCode: o.code, municipality: o.name, barangayCode: '', barangay: '', zipCode: '' }))}
      {select('Barangay', barangays, value.barangayCode, o => update({ barangayCode: o.code, barangay: o.name, zipCode: '' }))}
      {(['houseNumber', 'streetName', 'subdivision'] as const).map((key, i) => <label className="text-xs" key={key}>{['House Number / Building Number', 'Street Name', 'Subdivision / Village (optional)'][i]}<input required={key !== 'subdivision'} maxLength={200} className={`${className} mt-1`} value={value[key] || ''} onChange={e => update({ [key]: e.target.value })} /></label>)}
      <label className="text-xs">Postal / ZIP Code
        <input required aria-describedby={`${zipListId}-help`} inputMode="numeric" maxLength={4} pattern="[0-9]{4}" list={zipListId} className={`${className} mt-1`} value={value.zipCode || ''} onChange={e => update({ zipCode: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        <datalist id={zipListId}>{zips.map(x => <option key={x.code} value={x.code}>{x.area}</option>)}</datalist>
        <span id={`${zipListId}-help`} className="mt-1 block" aria-live="polite">{zipLoading ? 'Looking up your ZIP code...' : zipError || (!value.cityCode ? 'Select your city/municipality and barangay to fill your ZIP code automatically.' : zips.length === 1 ? 'ZIP code filled automatically for your selected area. You can correct it if needed.' : zips.length > 1 ? 'This area has multiple ZIP codes. Select a suggestion or enter your four-digit ZIP code.' : 'No matching ZIP code is available. Enter your four-digit ZIP code manually.')}</span>
        {zipError && <button type="button" className="underline" onClick={() => setRetry(x => x + 1)}>Retry ZIP lookup</button>}
      </label>
    </div>
  </fieldset>;
}
