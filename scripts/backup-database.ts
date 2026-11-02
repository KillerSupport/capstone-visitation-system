import mysql from 'mysql2/promise';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import 'dotenv/config';

// An SQL snapshot for restoration into an empty database. Never reset the source.
const conn=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'bjmp_visitation'});
try{
  await conn.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  const [tables]=await conn.query<any[]>('SHOW FULL TABLES WHERE Table_type=\'BASE TABLE\'');
  const sql=['-- Local database snapshot. Contains private account and application data.','SET FOREIGN_KEY_CHECKS=0;'];
  const counts:Record<string,number>={};
  for(const entry of tables){
    const table=String(Object.values(entry)[0]),quoted=mysql.escapeId(table);
    const [ddl]=await conn.query<any[]>(`SHOW CREATE TABLE ${quoted}`);sql.push(ddl[0]['Create Table']+';');
    const [rows]=await conn.query<any[]>(`SELECT * FROM ${quoted}`);counts[table]=rows.length;
    for(const row of rows)sql.push(`INSERT INTO ${quoted} (${Object.keys(row).map(mysql.escapeId).join(',')}) VALUES (${Object.values(row).map(value=>mysql.escape(value)).join(',')});`);
  }
  sql.push('SET FOREIGN_KEY_CHECKS=1;');await conn.commit();
  const dir=resolve('.local-backups');await mkdir(dir,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const target=resolve(dir,`before-paper-update-${stamp}.sql`);await writeFile(target,sql.join('\n'),'utf8');
  await writeFile(target+'.counts.json',JSON.stringify(counts,null,2));console.log(JSON.stringify({backup:target,counts}));
}finally{await conn.end();}
