// Reference data only. No account data is sent to the source.
import {mkdir,writeFile} from 'node:fs/promises';
const repository='fish-and-bear/psgc';
const meta=await (await fetch(`https://api.github.com/repos/${repository}/commits/main`)).json();
if(!/^[a-f0-9]{40}$/.test(meta.sha||''))throw Error('Could not resolve dataset revision.');
const base=`https://raw.githubusercontent.com/${repository}/${meta.sha}/`;
const data={};
for(const file of ['regions','provinces','cities','barangays','zip_codes']){
 const response=await fetch(`${base}psgc/data/core/${file}.json`);
 if(!response.ok)throw Error(`Dataset download failed: ${file}`);
 const source=await response.json();
 data[file]=file==='zip_codes'?source:source.map(x=>({code:x.psgc_code,name:x.name,regionCode:x.region_code||'',provinceCode:x.province_code||'',cityCode:x.city_code||'',level:x.geographic_level||''}));
}
if(data.regions.length<18||data.barangays.length<42000)throw Error('Incomplete nationwide dataset.');
const folder=new URL('../backend/data/',import.meta.url);await mkdir(folder,{recursive:true});
await writeFile(new URL('psgc.json',folder),JSON.stringify(data));
const license=await (await fetch(`${base}LICENSE`)).text();
await writeFile(new URL('PSGC-SOURCE.md',folder),`# Philippine geographic reference data\n\nSnapshot imported ${new Date().toISOString()}.\nSource: https://github.com/${repository}/tree/${meta.sha}\nThe source identifies its geographic hierarchy as PSA PSGC Q1 2026, based on the Q4 2025 datafile. ZIP codes are postal reference suggestions; users must confirm them.\nRun npm.cmd run address:refresh to refresh this snapshot deliberately. Review upstream changes before deployment.\n\n${license}`);
console.log(JSON.stringify({revision:meta.sha,regions:data.regions.length,provinces:data.provinces.length,cities:data.cities.length,barangays:data.barangays.length}));
