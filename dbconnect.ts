import { createPool } from 'mysql2/promise';
export const conn = createPool({
    connectionLimit: 10,
    host: "202.28.34.210",
    user: '66011212102',
    password: '66011212102',
    database: 'db66011212102',
    port: 3309
});
// dbconnect.ts