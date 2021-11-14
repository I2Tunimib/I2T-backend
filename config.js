export default {
  // path to dataset files relative to root folder
  DATASET_FILES_PATH: '/public/datasets',
  // path to dataset db relative to root folder
  DATASETS_DB_PATH: '/public/datasets.info.json',
  // path to tables db relative to root folder
  TABLES_DB_PATH: '/public/tables.info.json',
  
  services: {
    // path to services relative to root folder
    path: '/config/services',
    // specify service to exclude during config initialization
    // excluded services won't be available when the application is running
    exclude: {
      extenders: [],
      reconciliators: ['lamapi']
    }
  }
}