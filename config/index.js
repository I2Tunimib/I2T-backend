const dotenv = require('dotenv');

const env = dotenv.config();
if (env.error) {
    // This error should crash whole process
    throw new Error("⚠️  Couldn't find '.env' file  ⚠️");
}

const CONFIG = {
    ENV: process.env.ENV || 'DEV',
    PORT: process.env.PORT || '3002',
    ASIA_RECONCILIATION: process.env.ASIA_RECONCILIATION,
    ASIA_EXTENSION: process.env.ASIA_EXTENSION,
    WIKIDATA: process.env.WIKIDATA,
    LAMAPI_BASE: process.env.LAMAPI_BASE,
    LAMAPI_TOKEN: process.env.LAMAPI_TOKEN
}

module.exports = {CONFIG};

