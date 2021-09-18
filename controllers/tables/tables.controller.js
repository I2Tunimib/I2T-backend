import TableService from '../../services/tables/table.service';
import ParseService from '../../services/parse/parse.service';
import TableUtilsService from '../../services/tables/table-utils.service';

const TablesController = {
  getTable: async (req, res, next) => {
    const { headers, params: { id } } = req;
    const acceptHeader = headers.accept;

    const table = await TableService.findOne(id);

    if (acceptHeader === 'application/octet-stream') {
      res.download(await TableUtilsService.getTableFile(table));
    } else {
      const { columns, rows } = await ParseService.parse(table);
      res.json({ table, columns, rows });
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
    const { meta: tableData }= req.body;
    const { file: tableFile } = req.files;
    const newTable = await TableService.addOne(JSON.parse(tableData), tableFile);
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
  }
}

export default TablesController;
