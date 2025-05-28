import fs from "fs";

export default async (req, res) => {
  // fs.writeFile('../../fileSemTUI/responseEXT-labels.json',
  //     JSON.stringify(res), function (err) {
  //       if (err) throw err;
  //       console.log('File ../../fileSemTUI/responseEXT-labels.json saved!');
  //     });

  const { items, props } = req.processed;
  const { wikidata } = res;
  // input columns ids from the request items
  const inputColumnName = Object.keys(items)[0];

  console.log(
    `*** Label Extender *** inputColumn: ${JSON.stringify(inputColumnName)}`
  );

  const response = {
    // columns entities to be added
    columns: {},
    // mapping between the new column obtained from extension of the input column (i.e.: { newColumnId: inputColumnId })
    // meta is used to place the new columns in the correct order in the UI.
    meta: {},
  };

  for (const label of props.labels) {
    const newColumnName = label + "_" + inputColumnName;
    const newColumn = {};
    newColumn[newColumnName] = {
      label: newColumnName,
      metadata: [],
      cells: {},
    };
    // console.log(`*** Label Extender *** rowCell: ${JSON.stringify(newColumn)}`);
    // Add rowCell to the columns object
    response.columns = { ...newColumn, ...response.columns };
    // Update meta to put the new column next to the inputColumnName
    // response.meta[newColumnName] = inputColumnName;
    response.meta = { [newColumnName]: inputColumnName, ...response.meta };
  }

  for (const key in res) {
    // for each entity
    // console.log(`*** Label Extender *** key: ${JSON.stringify(key)}`);
    // console.log(`*** Label Extender *** items: ${JSON.stringify(items)}`);
    const buyerItems = items[inputColumnName] || {};
    const rowIdKey = buyerItems[`wd:${key}`] || buyerItems[`wdA:${key}`] || [];

    // all rows with entity identified by key
    // console.log(`*** Label Extender *** entityIdKey: ${JSON.stringify(rowIdKey)}`);
    for (const row of rowIdKey) {
      // for each row with entity identified by key
      for (const property of props.labels) {
        // for each requested property
        const newColumnName = property + "_" + inputColumnName;
        const newCellContent = {
          label: "",
          metadata: [],
        };
        switch (property) {
          case "id":
            newCellContent.label = key;
            break;
          case "url":
            newCellContent.label = res[key].url;
            break;
          case "name":
            newCellContent.label = res[key].labels.en;
            break;
          case "description":
            newCellContent.label = res[key].description;
        }
        // console.log(`*** Label Extender *** newCellContent: ${JSON.stringify(newCellContent)}`);
        const newCell = {
          [row]: { ...newCellContent },
        };
        // console.log(`*** Label Extender *** newCell: ${JSON.stringify(newCell)}`);
        response.columns[newColumnName].cells = {
          ...response.columns[newColumnName].cells,
          ...newCell,
        };
      }
    }
  }

  const responseConst = {
    columns: {
      id_buyer: {
        label: "id_buyer",
        metadata: [],
        cells: {
          r2: {
            label: "Q4916650",
            metadata: [],
          },
        },
      },
      url_buyer: {
        label: "url_buyer",
        metadata: [],
        cells: {
          r2: {
            label: "https://www.wikidata.org/wiki/Q4916650",
            metadata: [],
          },
        },
      },
      name_buyer: {
        label: "name_buyer",
        metadata: [],
        cells: {
          r2: {
            label: "birmingham city council",
            metadata: [],
          },
        },
      },
      description_buyer: {
        label: "description_buyer",
        metadata: [],
        cells: {
          r2: {
            label: "local government body for the English city",
            metadata: [],
          },
        },
      },
    },
    meta: {},
  };

  // fs.writeFile('../../fileSemTUI/responseEXT-UI-labels.json',
  //     JSON.stringify(response), function (err) {
  //       if (err) throw err;
  //       // console.log('File ../../fileSemTUI/responseEXT-UI-labels.json saved!');
  //     });

  return response;
};
