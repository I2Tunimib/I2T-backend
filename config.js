import atokaPeopleExtender from "./src/services/extenders/atokaPeopleExtender/index.js";

export default {
  //Keycloak configuration
  keycloak: {
    enabled: true,
    // Prefer explicit KEYCLOAK_REALM_URL, but fall back to KEYCLOAK_ISSUER when only that is provided.
    // This avoids requiring duplicate env vars (KEYCLOAK_REALM_URL + KEYCLOAK_ISSUER).
    realmUrl:
      process.env.KEYCLOAK_REALM_URL || process.env.KEYCLOAK_ISSUER || null,
    jwksUri: process.env.KEYCLOAK_JWKS_URI || null,
    issuer: process.env.KEYCLOAK_ISSUER || null,
    backendClientId: process.env.KEYCLOAK_BACKEND_CLIENT_ID || "I2T-backend",
    frontendClientId: process.env.KEYCLOAK_FRONTEND_CLIENT_ID || "I2T-frontend",
  },
  // path to dataset files relative to root folder
  datasetFilesPath: "/public/datasets",
  // path to dataset db relative to root folder
  datasetDbPath: "/public/datasets.info.json",
  // path to tables db relative to root folder
  tablesDbPath: "/public/tables.info.json",
  // path to folder with temporary files
  tmpPath: "/tmp",
  // path to users db relative to root folder
  usersPath: "/public/users.info.json",
  errors: {
    reconciler: {
      "01": "External reconciliation service error.",
      "02": "Reconciliation operation server error",
    },
    extender: {
      11: "External extension service error.",
      12: "Extension operation server error",
    },
  },
  services: {
    // path to services relative to src folder
    path: "/services",
    // specify services to exclude during config initialization
    // excluded services won't be loaded during app startup
    exclude: {
      extenders: [
        ".DS_Store",
        "asiaGeonames",
        "asiaWeather",
        "atokaExtender",
        "atokaPeopleExtender",
        "parametricWikiDataSelectSPARQL",
        "parametricWikiDataSPARQL",
        "wikidataGeoPropertiesSPARQL",
      ],
      reconcilers: [
        ".DS_Store",
        "lionLinker",
        "asiaKeywordsMatcher",
        "asiaWikifier",
        "atokaMatch2",
        "atokaPeople",
      ],
    },
  },
};
