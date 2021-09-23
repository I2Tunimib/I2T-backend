import dotenv from 'dotenv';
const env = dotenv.config();

if (process.env.ENV === 'DEV' && env.error) {
    // This error should crash whole process
    throw new Error("⚠️  Couldn't find '.env' file  ⚠️");
}

const CONFIG = {
    ENV: process.env.ENV || 'DEV',
    PORT: process.env.PORT || '3002',
    TABLES_DB_PATH: './public/tables.info.json',
    CHALLENGE_TABLES_BACKEND: 'http://localhost:3003',
    ASIA_RECONCILIATION: process.env.ASIA_RECONCILIATION,
    ASIA_EXTENSION: process.env.ASIA_EXTENSION,
    WIKIDATA: process.env.WIKIDATA,
    LAMAPI_BASE: process.env.LAMAPI_BASE,
    LAMAPI_TOKEN: process.env.LAMAPI_TOKEN
}

export default CONFIG;

