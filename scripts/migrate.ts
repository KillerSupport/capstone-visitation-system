import {initDatabase,pool} from '../backend/database/db.js';
try{await initDatabase();console.log('Additive feature migrations completed. Existing records preserved.')}finally{await pool.end()}
