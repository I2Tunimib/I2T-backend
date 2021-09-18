import { writeFile, rm } from 'fs/promises';
import { nanoid } from 'nanoid';
import { queue } from 'async';
import CONFIG from '../../config';
import ParseService from '../parse/parse.service';
import TableUtilsService from './table-utils.service';

const { TABLES_DB_PATH } = CONFIG;

// create queue so that writes to file are not lost
const writeQueue = queue(async (task, completed) => {
  const tables = await task();
  await writeFile(TABLES_DB_PATH, JSON.stringify(tables, null, 2));
}, 1); 

const TableService = {
  findOne: async (tableId) => {
    const table = await ParseService.readOneRecord(TABLES_DB_PATH, (obj) => obj.id === tableId);
    return table
  },
  findOneByName: async (tableName) => {
    const table = await ParseService.readOneRecord(TABLES_DB_PATH, (obj) => obj.name === tableName);
    if (table) {
      return table;
    }
    return null;
  },
  findAll: async () => {
    const tables = await ParseService.readJsonFile(TABLES_DB_PATH, []);
    return TableUtilsService.orderTables(tables);
  },
  findAllByType: async (type) => {
    const tables = await ParseService.readJsonFileWithCondition(TABLES_DB_PATH, (obj) => obj.type === type);
    return TableUtilsService.orderTables(tables);
  },
  findBySearch: async (search) => {
    const regex = new RegExp(search.toLowerCase());
    const tables = await ParseService.readJsonFileWithCondition(TABLES_DB_PATH, (obj) => regex.test(obj.name.toLowerCase()));
    return TableUtilsService.orderTables(tables);
  },
  addOne: async (tableData, tableFile) => {
    let newTable = {};
    await writeQueue.push(async () => {
      const tables = await ParseService.readJsonFile(TABLES_DB_PATH);
      const table = {
        id: nanoid(),
        ...tableData,
        name: await TableUtilsService.getTableName(tableData.name),
        lastModifiedDate: tableData.lastModifiedDate || new Date().toISOString()
      }
      tables[table.id] = table;
      newTable = table;
      return tables;
    });
    if (tableFile.mv) {
      await tableFile.mv(TableUtilsService.getTablePath(newTable));
    } else {
      await writeFile(TableUtilsService.getTablePath(newTable), tableFile);
    }
    return newTable;
  },
  updateOne: async (tableData, tableFile) => {
    let newTable = {};
    await writeQueue.push(async () => {
      const tables = await ParseService.readJsonFile(TABLES_DB_PATH);
      tables[tableData.id] = tableData;
      newTable = tables[tableData.id];
      return tables;
    });
    await writeFile(TableUtilsService.getTablePath(newTable), tableFile);
    return newTable;
  },
  removeOne: async (tableId) => {
    let tableToDelete = {};
    await writeQueue.push(async () => {
      const tables = await ParseService.readJsonFile(TABLES_DB_PATH);
      tableToDelete = tables[tableId];
      delete tables[tableId];
      return tables;
    });
    await rm(TableUtilsService.getTablePath(tableToDelete));
  },
  save: async (table) => {
    const { tableInstance, columns, rows } = table;
    const file = JSON.stringify({ columns, rows });
    if (!tableInstance.id) {
      return TableService.addOne(tableInstance, file);
    } else {
      return TableService.updateOne(tableInstance, file);
    }
  }
};

export default TableService;