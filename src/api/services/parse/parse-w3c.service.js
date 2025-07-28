import ParseService from "./parse.service.js";
import FileSystemService from "../datasets/datasets.service.js";
import { PassThrough } from "stream";
import { parse } from "JSONStream";
import { KG_INFO } from "../../../utils/constants.js";

const DEFAULT_HEADER_PROPERTIES = {
  label: "",
  status: "empty",
  // extension: '',
  context: {},
  metadata: [],
  // expanded: false
};

const DEFAULT_CELL_PROPERTIES = {
  label: "",
  // editable: false,
  // expanded: false
};

const ParseW3C = {
  getContext: (context) => {
    return context.reduce((acc, item) => {
      const prefix = item.prefix.substring(0, item.prefix.length - 1);
      acc[prefix] = {
        prefix,
        ...item,
        total: 0,
        reconciliated: 0,
      };
      return acc;
    }, {});
  },
  updateColumnsStatus: (columns, rows) => {
    Object.keys(columns).forEach((colId) => {
      const { context } = columns[colId];
      const totalReconciliated = Object.keys(context).reduce(
        (acc, key) => acc + context[key].reconciliated,
        0,
      );
      const hasMetadata = Object.keys(context).some(
        (key) => context[key].total > 0,
      );

      if (totalReconciliated === Object.keys(rows).length) {
        columns[colId].status = "reconciliated";
      } else if (hasMetadata) {
        columns[colId].status = "pending";
      }
    });
  },
  parseHeader: (header, reconciliators) => {
    const getEntityMetadata = (metaRaw) => {
      if (!metaRaw || metaRaw.length === 0) {
        return {
          annotated: false,
        };
      }

      if (metaRaw.length > 0 && !metaRaw[0].entity) {
        return {
          annotated: false,
        };
      }

      return {
        annotated: true,
        data: FileSystemService.transformMetadata(metaRaw[0].entity),
      };
    };

    return Object.keys(header).reduce((columns, key) => {
      const { label, context = [], metadata: metaRaw, ...rest } = header[key];

      const {
        annotated,
        data: { lowestScore, highestScore, match, metadata } = {
          lowestScore: 0,
          highestScore: 0,
          match: false,
          metadata: [],
        },
      } = getEntityMetadata(metaRaw);

      columns[label] = {
        id: label,
        ...DEFAULT_HEADER_PROPERTIES,
        label,
        context: ParseW3C.getContext(context),
        ...(metaRaw &&
          metaRaw.length > 0 && {
            metadata: [
              {
                ...metaRaw[0],
                ...(annotated && {
                  entity: metadata,
                }),
              },
            ],
          }),
        annotationMeta: {
          annotated: annotated,
          match: {
            value: match,
          },
          lowestScore,
          highestScore,
        },
        ...rest,
      };
      return columns;
    }, {});
  },
  // prepareMetadata: (metadata, columns, minMetaScore, maxMetaScore) => {
  //   const { lowestScore, highestScore, match, metadata } = FileSystemService.transformMetadata(metadata);
  //   minMetaScore = lowestScore < minMetaScore ? lowestScore : minMetaScore;
  //   maxMetaScore = highestScore > maxMetaScore ? highestScore : maxMetaScore;

  //   return {
  //     annotationMeta: {
  //       ...(columns[colId].kind === 'entity' && {
  //         annotated: true
  //       }),
  //       match,
  //       lowestScore,
  //       highestScore
  //     },
  //     metadata
  //   }
  //   try {
  //     const a = metadata.map(({id, name, ...rest}) => {
  //       const [prefix, resourceId] = id.split(':');

  //       const kgUrl = KG_INFO[prefix] ? KG_INFO[prefix].uri : ''

  //       return {
  //         id,
  //         name: { value: name, uri: `${kgUrl}${resourceId}` },
  //         ...rest,
  //         annotationMeta: {
  //           ...(columns[colId].kind === 'entity' && {
  //             annotated: true
  //           }),
  //           match,
  //           lowestScore,
  //           highestScore
  //         },
  //         metadata
  //       }

  //       return {
  //         id,
  //         name: { value: name, uri: `${kgUrl}${resourceId}` },
  //         ...rest
  //       }
  //     })
  //   } catch (err) {
  //     console.log(err);
  //   }
  // },
  isCellReconciliated: (metadata) => metadata.some((item) => item.match),
  updateReconciliatorsCount: (metadata, column, columns) => {
    if (metadata.length > 0) {
      const [prefix, _] = metadata[0].id.split(":");
      const { total, reconciliated } = columns[column].context[prefix];

      columns[column].context[prefix] = {
        ...columns[column].context[prefix],
        total: total + 1,
        reconciliated: ParseW3C.isCellReconciliated(metadata)
          ? reconciliated + 1
          : reconciliated,
      };
    }
  },
  addRow: (rows, parsedRow) => {
    rows[parsedRow.id] = parsedRow;
  },
  parseRow: (row, index, columns, minMetaScore, maxMetaScore) => {
    const id = `r${index}`;
    let nReconciliated = 0;
    const cells = Object.keys(row).reduce((acc, column) => {
      const { metadata: metaRaw = [], ...rest } = row[column];
      const { lowestScore, highestScore, match, metadata } =
        FileSystemService.transformMetadata(metaRaw);
      minMetaScore = lowestScore < minMetaScore ? lowestScore : minMetaScore;
      maxMetaScore = highestScore > maxMetaScore ? highestScore : maxMetaScore;

      ParseW3C.updateReconciliatorsCount(metadata, column, columns);

      acc[column] = {
        id: `${id}$${column}`,
        ...DEFAULT_CELL_PROPERTIES,
        ...rest,
        metadata,
        annotationMeta: {
          // ...(columns[column]?.kind === "entity" && {
          //   annotated: true,
          // }),
          annotated: metadata.length > 0,
          match,
          lowestScore,
          highestScore,
        },
      };
      if (metadata.some((item) => item.match)) {
        nReconciliated += 1;
      }
      return acc;
    }, {});
    return { id, cells, nReconciliated };
  },
  parse: async (entry) => {
    try {
      const { reconciliators } = await ParseService.readYaml("./config.yml");
      // const stream = ParseService.createJsonStreamReader(filePath);
      const passThrough = new PassThrough({
        objectMode: true,
      });
      // const stream = ParseService.createJsonStreamReader(path);
      const stream = entry.pipe(parse("*")).pipe(passThrough);

      let columns = {};
      let rows = {};
      let nCells = 0;
      let nCellsReconciliated = 0;
      let minMetaScore = 0;
      let maxMetaScore = 0;

      let rowIndex = -1;

      for await (const row of stream) {
        if (rowIndex === -1) {
          // to parse header and transform to initial state.
          // we need to add information after rows are parsed.
          columns = ParseW3C.parseHeader(row, reconciliators);
          // pass to next iteration
          rowIndex += 1;
          continue;
        }
        // parse row and update reconciliators count
        const { nReconciliated, ...rest } = ParseW3C.parseRow(
          row,
          rowIndex,
          columns,
          minMetaScore,
          maxMetaScore,
        );
        ParseW3C.addRow(rows, rest);
        nCellsReconciliated += nReconciliated;
        rowIndex += 1;
      }
      // update columns reconciliated status
      ParseW3C.updateColumnsStatus(columns, rows);
      nCells = Object.keys(rows).length * Object.keys(columns).length;
      stream.end();
      const data = { columns, rows, nCells, nCellsReconciliated };
      return { status: "success", data };
    } catch (err) {
      entry.destroy();
      return { status: "error" };
    }
  },
};

export default ParseW3C;
