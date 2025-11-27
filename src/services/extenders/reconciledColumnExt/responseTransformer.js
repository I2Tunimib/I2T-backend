import fetch from "node-fetch";

// async function getName(id) {
//   let result = "";
//   if (id) {
//     if (id.startsWith("wd:")) {
//       const cleanId = id
//         .replace(/^wd:/, "")
//         .replace(/^wdA:/, "")
//         .replace(/^wdL:/, "")
//         .trim();
//       const url = `https://www.wikidata.org/wiki/Special:EntityData/${cleanId}.json`;
//       const res = await fetch(url);
//       const data = await res.json();
//       const entity = data.entities?.[cleanId];
//       result = entity?.labels?.en?.value || "";
//     } else if (id.startsWith("geo:")) {
//       const endpoint = process.env.GEONAMES;
//       const token = process.env.GEONAMES_TOKEN;
//       const cleanId = id.replace(/^geo:/, "").trim();
//       const url = `${endpoint}/getJSON?geonameId=${cleanId}&username=${token}`;
//       const res = await fetch(url);
//       const item = await res.json();
//       result = item.name;
//     }
//   }
//   return String(result);
// }
function getName(metaObj) {
  if (metaObj.name) {
    if (metaObj.name.value) return metaObj.name.value;
    else return "N/A";
  } else return "N/A";
}
function getId(metaObj) {
  if (metaObj.kbId) {
    if (metaObj.kbId.startsWith("http")) return metaObj.kbId;
    else
      return (
        metaObj.kbId.includes(":") ? metaObj.kbId.split(":", 2)[1] : "N/A"
      ).trim();
  }
  return;
}

async function getRowDict(column) {
  const dict = {};
  for (const row of Object.keys(column)) {
    if (column[row] !== undefined) {
      dict[row] = {
        name: await getName(column[row]),
        id: getId(column[row]),
      };
    }
  }
  return dict;
}

function getLabel(dict, prop, row) {
  return dict[row][prop];
}

export default async function responseTransformer(req, res) {
  const { items, props } = req.original;
  const { selectedColumns } = props;

  if (!selectedColumns || selectedColumns.length === 0) {
    throw new Error(
      "At least one column must be selected before running the operation.",
    );
  }
  const property = res.property;

  const response = { columns: {}, meta: {} };

  for (const col of selectedColumns) {
    for (const prop of property) {
      const label_column = `${prop}_${col}`;
      response.columns[label_column] = {
        label: label_column,
        metadata: [],
        cells: {},
      };

      const columnData = items[col];
      const dictRow = await getRowDict(columnData);

      for (const row_id of Object.keys(columnData)) {
        const label_result = getLabel(dictRow, prop, row_id);
        response.columns[label_column].cells[row_id] = {
          label: label_result,
          metadata: [],
        };
      }
    }
  }

  return response;
}
