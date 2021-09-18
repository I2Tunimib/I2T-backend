import { stat } from 'fs/promises';
import { readFile } from 'fs/promises';
import CONFIG from '../../config';
import TableService from "./table.service";

const { TABLES_DB_PATH } = CONFIG;

const TableUtilsService = {
  getTablesObject: async () => {
    return JSON.parse(await readFile(TABLES_DB_PATH));
  },
  getTableName: async (tableName, index = 0) => {
    const name = index === 0 ? tableName : `${tableName} - (${index})`;
    if (!(await TableService.findOneByName(name))) {
      return name;
    }
    return TableUtilsService.getTableName(tableName, ++index);
  },
  getTablePath: (table) => {
    const { id, type, format } = table;
    let basePath = './public';
    if (type === 'raw') {
      basePath += '/raw-tables';
    } else if (type === 'annotated') {
      basePath += '/annotated-tables';
    }
    return `${basePath}/${id}.${format}`;
  },
  getTableFile: async (tableId) => {
    const table = await TableService.findOne(tableId);
    return readFile(TableUtilsService.getTablePath(table));
  },
  getTableFileStats: async (table) => {
    return stat(TableUtilsService.getTablePath(table));
  },
  orderTables: async (tables, filter = 'ascending') => {
    return tables.sort((tableA, tableB) => {
      const dateA = new Date(tableA.lastModifiedDate);
      const dateB = new Date(tableB.lastModifiedDate);
      return filter === 'ascending' ? (dateA < dateB ? 1 : -1) : (dateA < dateB ? -1 : 1);
    });
  },
};

export default TableUtilsService;
