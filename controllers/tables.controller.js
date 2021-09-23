import { readFile, rm } from 'fs/promises';
import TableService from '../services/tables/table.service';
import ParseService from '../services/parse/parse.service';
import TableUtilsService from '../services/tables/table-utils.service';
import ChallengeService from '../services/tables/challenge.service';

const TablesController = {
  getTable: async (req, res, next) => {
    const { headers, params: { id } } = req;
    const acceptHeader = headers.accept;

    const table = await TableService.findOne(id);
    console.log(table);

    if (acceptHeader === 'application/octet-stream') {
      res.download(await TableUtilsService.getTableFile(table));
    } else {
      let response = { table };

      if (table.type === 'annotated') {
        response = {
          ...response,
          ...JSON.parse(await readFile(TableUtilsService.getTablePath(table)))
        };
      } else {
        response = {
          ...response, 
          ...await ParseService.parse(
            TableUtilsService.getTablePath(table), { 
            tableType: table.type,
            tableFormat: table.format,
            separator: table.separator
        })};
      }
      res.json(response);
    }
  },
  getTables: async (req, res, next) => {
    const { search, type } = req.query
    if (search) {
      return res.json(await TableService.findBySearch(search));
    }
    if (type) {
      return res.json(await TableService.findAllByType(type));
    }
    return res.json(await TableService.findAll());
  },
  createTable: async (req, res, next) => {
    let { meta: tableData }= req.body;
    let { file: tableFile } = req.files;

    tableData = JSON.parse(tableData);
    
    if (tableData.type === 'annotated') {
      const { tempFilePath } = tableFile;
      tableFile = JSON.stringify(await ParseService.parse(tempFilePath, {
        tableType: 'annotated',
        tableFormat: 'json'
      }));
      await rm(tempFilePath);
    }
    const newTable = await TableService.addOne(tableData, tableFile);
    res.json(newTable);
  },
  importTable: async (req, res, next) => {
    let { meta: tableData }= req.body;
    let { file } = req.files;
    tableData = JSON.parse(tableData);

    
    const { tempFilePath } = file;
    const tableFile = JSON.stringify(await ParseService.parse(tempFilePath, {
      tableType: tableData.type,
      tableFormat: tableData.format,
      separator: tableData.separator
    }));

    delete tableData.separator;
    await rm(tempFilePath);

    tableData = {
      ...tableData,
      type: 'annotated',
      format: 'json'
    };
    const newTable = await TableService.addOne(tableData, tableFile);
    res.json(newTable);
  },
  saveTable: async (req, res, next) => {
    const table = req.body;
    const newTable = await TableService.save(table);
    res.json(newTable);
  },
  deleteTable: async (req, res, next) => {
    const { params: { id } } = req;
    await TableService.removeOne(id);
    res.status(200).json();
  },
  getChallengeDatasets: async (req, res, next) => {
    res.json(await ChallengeService.findAllDatasets());
  }
}

export default TablesController;
