export default {
  // path to dataset files relative to root folder
  datasetFilesPath: '/public/datasets',
  // path to dataset db relative to root folder
  datasetDbPath: '/public/datasets.info.json',
  // path to tables db relative to root folder
  tablesDbPath: '/public/tables.info.json',
  // path to folder with temporary files
  tmpPath: '/tmp',
  // path to users db relative to root folder
  usersPath: '/public/users.info.json',

  services: {
    // path to services relative to src folder
    path: '/services',
    // specify services to exclude during config initialization
    // excluded services won't be loaded during app startup
    exclude: {
      extenders: [".DS_Store", "asiaGeonames", "asiaWheater", "atokaExtender", "atokaPeopleExtender"],
      reconciliators: [".DS_Store", "lamapi", "asiaGeonames", "asiaWikifier", "asiaKeywordsMatcher", "atokaMatch2", "atokaPeople"]
    }
  }
}