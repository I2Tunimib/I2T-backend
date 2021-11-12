import { stringify } from 'qs';
import axios from 'axios';
import CONFIG from '../../config';
import { KG_INFO } from '../../utils/constants';

/**
 * This service is responsible to transform the request and query the extension service.
 * 
 * Each function takes as ainput the request coming from the client.
 */
export const ExtensionRequestTransformer = {
  asiaGeo: async (req) => {
    const { items, property } = req;

    return Promise.all(Object.keys(items).map(async (colId) => {
      const columnItems = items[colId]
      const { ids, idsMap } = Object.keys(columnItems).reduce((acc, key) => {
        const id = columnItems[key].split(':')[1];
        acc.ids.push(id);
        acc.idsMap[id] = key
        return acc;
      }, { ids: [], idsMap: {} });

      const properties = property.map((prop) => ({ id: prop }));

      const params = stringify({
        extend: JSON.stringify({ ids, properties }),
        conciliator: 'geonames',
      })

      const res = await axios.post(`${CONFIG.ASIA_EXTENSION}/extend`, params);

      return {
        res: res.data,
        idsMap
      }
    }));
  },
  asiaWeather: async (req) => {
    const { items, offsets, dates: datesInput, weatherParams: weatherParamsInput } = req;
    // process weather params
    const weatherParams = weatherParamsInput.join(',');
    // for each column to extend
    const allResponses = await Promise.all(Object.keys(items).map(async (colId) => {
      const columnItems = items[colId];

      const requests = Object.keys(columnItems).map((rowId) => {
        const id = columnItems[rowId].split(':')[1];
        const date = datesInput[rowId];

        return {
          ids: id,
          rowId,
          dates: date,
          offsets,
          weatherParams
        }
      });

      return Promise.all(requests.map(async ({ ids, rowId, ...rest }) => {
        const res = await axios.post(`${CONFIG.ASIA_EXTENSION}/weather`, stringify({ ids, ...rest }));
        return {
          id: ids,
          rowId,
          data: res.data
        }
      }))
    }));

    return allResponses;
  }
}

/**
 * This service is responsible to transform the response of an extension service to
 * the standard format:
 * 
 * type Column = {
 *   [id]: {
 *     id: string (same id as key);
 *     label: string;
 *     metadata?: []
 *   }
 * }
 * 
 * type Row = {
 *   [id (given in request)]: {
 *     id: string (same id as key);
 *     cells: Record<id, Cell>;
 *   }
 * }
 * 
 * type Cell = {
 *   id: '[idRow]$[idColumn]'
 *   label: string;
 *   metadata?: []
 * }
 * 
 * type Metadata = {
 *   id: [prefix]:id (e.g.: geo:74485)
 *   name: string;
 *   match: boolean;
 *   score: number;
 * }
 * 
 * RESPONSE = {
 *  columns: Record<id, Column>;
 *  rows: Record<id, Cell>;
 * }
 */

/**
 * Each function takes as input the request body, the response body 
 * and additional parameters.
 */
export const ExtensionResponseTransformer = {
  asiaGeo: async ({ req, res }) => {
    // response is an array of responses coming from the extension service (one for each column)
    const { items } = req;

    const inputColumnsLabels = Object.keys(items);

    let response = {
      columns: {},
      rows: {},
      meta: {}
    }

    // build each column in standard format
    // for each input column a set of extended column is created
    res.forEach((serviceResponse, colIndex) => {
      // each meta is a property which identifies a new column
      const { meta, rows } = serviceResponse.res;
      const { idsMap } = serviceResponse

      const standardCol = meta.reduce((acc, property) => {
        const { id: propId } = property;
        const colId = `${inputColumnsLabels[colIndex]}_${propId}`;
        // add column
        acc.columns[colId] = {
          id: colId,
          label: colId,
          metadata: []
        }
        acc.meta[colId] = inputColumnsLabels[colIndex];
        // add rows
        acc.rows = Object.keys(rows).reduce((accRows, metaId) => {
          const metadataItems = rows[metaId][propId];
          const rowId = idsMap[metaId];
          const cellId = `${rowId}$${colId}`;
          // check if service returned something
          if (metadataItems && metadataItems.length > 0) {
            // get first one
            const { id: metadataItemId, name: metadataItemName } = metadataItems[0];

            accRows[rowId] = {
              id: rowId,
              cells: {
                ...(accRows[rowId] && { ...accRows[rowId].cells }),
                [colId]: {
                  id: cellId,
                  label: metadataItemName,
                  metadata: [{
                    id: `geo:${metadataItemId}`,
                    name: metadataItemName,
                    match: true,
                    score: 100
                  }]
                }
              }
            }
          } else {
            accRows[rowId] = {
              id: rowId,
              cells: {
                ...(accRows[rowId] && { ...accRows[rowId].cells }),
                [colId]: {
                  id: cellId,
                  label: 'null',
                  metadata: []
                }
              }
            }
          }
          return accRows;
        }, response.rows)
        return acc;
      }, response);

      response.columns = {
        ...response.columns,
        ...standardCol.columns
      }
      response.rows = {
        ...response.rows,
        ...standardCol.rows
      }
    })
    return response;
  },
  asiaWeather: async ({ req, res }) => {
    const { items } = req;
    const inputColumnsLabels = Object.keys(items);

    let response = {
      columns: {},
      rows: {},
      meta: {}
    }

    // result for each input column
    res.forEach((serviceResponse, colIndex) => {
      serviceResponse.forEach(({ rowId, data }) => {
        data.forEach(({ weatherParameters, offset }) => {
          if (weatherParameters) {
            // for each combination offest_weatherParam build a column
            weatherParameters.forEach(({ id, ...rest }) => {
              // for each item in weatherParameters build a column
              const colId = `${inputColumnsLabels[colIndex]}_offset${offset}_${id}`;
              response.columns[colId] = {
                id: colId,
                label: colId,
                metadata: []
              }
              response.meta[colId] = inputColumnsLabels[colIndex];

              const cellId = `${rowId}$${colId}`;
              response.rows[rowId] = {
                ...response.rows[rowId],
                id: rowId,
                cells: {
                  ...(response.rows[rowId] && { ...response.rows[rowId].cells }),
                  [colId]: {
                    id: cellId,
                    label: id === 'sund' ? rest.cumulValue : rest.avgValue,
                    metadata: []
                  }
                }
              }
            });
          }
        });
      });
    });

    return response;
  }
}


const getColumnStatus = (context, rowKeys) => {
  const { total, reconciliated } = Object.keys(context).reduce((acc, key) => {
    acc.total += context[key].total
    acc.reconciliated += context[key].reconciliated
    return acc;
  }, { reconciliated: 0, total: 0 });

  if (reconciliated === rowKeys.length) {
    return 'reconciliated'
  }
  if (total > 0) {
    return 'pending'
  }
  return 'empty'
}

/**
 * Count cell reconciliated and compute column status
 */
export const postTransform = async (standardData) => {
  const { columns, rows, ...rest } = standardData;

  const rowKeys = Object.keys(rows);

  Object.keys(columns).forEach((colId) => {
    const context = {}

    rowKeys.forEach((rowId) => {
      const metadata = rows[rowId].cells[colId].metadata;

      if (metadata) {
        metadata.forEach((metaItem) => {
          const prefix = metaItem.id.split(':')[0];

          if (!context[prefix]) {
            context[prefix] = {
              prefix: `${prefix}:`,
              uri: KG_INFO[prefix].uri,
              total: 0,
              reconciliated: 0
            }
          }

          context[prefix] = {
            total: context[prefix].total + 1,
            reconciliated: metaItem.match ? context[prefix].reconciliated + 1 : context[prefix].reconciliated
          }
        })
      }
    })
    columns[colId].context = context;
    columns[colId].status = getColumnStatus(context, rowKeys);
  })

  return {
    columns,
    rows,
    ...rest
  }
}