import { KG_INFO } from '../../../utils/constants';

const mapToUnique = (column) => {
  return Object.keys(column).reduce((acc, rowId) => {
    // get id
    // const id = column[rowId].split(':')[1];
    const id = column[rowId]

    if (column[rowId] in acc) {
      acc[id] = [...acc[id], rowId];
    } else {
      acc[id] = [rowId];
    }
    return acc;
  }, {});
}

export const getUniqueMaps = (columns) => {
  return Object.keys(columns).reduce((acc, colId) => {
    acc[colId] = mapToUnique(columns[colId]);
    return acc;
  }, {});
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
            ...context[prefix],
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