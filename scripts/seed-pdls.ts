import {pathToFileURL} from 'node:url';
import {initDatabase,pool} from '../backend/database/db.js';
const batch='FICTIONAL-PDL-DEMO-50-V1';
const first=['Adrian','Beatriz','Carlo','Danica','Emilio','Fatima','Gabriel','Hazel','Isandro','Janelle','Kristoffer','Lourdes','Mateo','Nerissa','Orlando','Patricia','Rafael','Selina','Tomas','Veronica','Wilfredo','Yasmin','Zandro','Amalia','Bernardo'];
const last=['Aguilar','Bautista','Castillo','Del Rosario','Enriquez','Fernandez','Galang','Hernandez','Ignacio','Jimenez','Lacson','Mendoza','Navarro','Ocampo','Pangilinan','Quinto','Reyes','Santiago','Tolentino','Villanueva','Zamora','Abad','Belmonte','Cabrera','Domingo'];
export async function seedDemoPdls(){
 const conn=await pool.getConnection();
 try{await conn.beginTransaction();
 const [facilities]=await conn.query<any[]>("SELECT id FROM jail_facilities WHERE id IN ('imus-city-jail-male','imus-city-jail-female')");
 if(facilities.length!==2)throw Error('Configure both Imus dormitories before adding demonstration records.');
 for(let i=0;i<50;i++){
  const id=`fictional-pdl-demo-${String(i+1).padStart(3,'0')}`,number=`DEMO-FICTIONAL-${String(i+1).padStart(3,'0')}`;
  const [existing]=await conn.query<any[]>('SELECT id,demo_batch FROM pdls WHERE id=? OR pdl_number=? FOR UPDATE',[id,number]);
  if(existing.length){if(existing.length!==1||existing[0].id!==id||existing[0].demo_batch!==batch)throw Error('A demonstration identifier conflicts with an existing record. Nothing was overwritten.');continue;}
  const facilityId=i%2?'imus-city-jail-female':'imus-city-jail-male';
  await conn.query(`INSERT INTO pdls(id,pdl_number,first_name,middle_name,last_name,date_of_birth,sex,citizenship,jail_facility_id,cell_dormitory,status,aliases,case_status,demo_batch)
   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[id,number,first[i%25],last[(i+7)%25],last[(i*7+Math.floor(i/25))%25],`${1975+i%25}-${String(1+i%12).padStart(2,'0')}-${String(1+i%27).padStart(2,'0')}`,i%2?'Female':'Male','Filipino',facilityId,`Demonstration Dorm ${1+i%5}`,'In Custody','FICTIONAL DEMONSTRATION DATA — no real identity or criminal allegation','Fictional demonstration only',batch]);
 }
 const [count]=await conn.query<any[]>('SELECT COUNT(*) AS n FROM pdls WHERE demo_batch=?',[batch]);if(Number(count[0].n)!==50)throw Error('Expected exactly 50 marked demonstration records.');
 await conn.commit();return {fictionalDemoRecords:50,preservedExistingRecords:true};
 }catch(e){await conn.rollback();throw e}finally{conn.release()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await initDatabase();console.log(await seedDemoPdls())}finally{await pool.end()}}
