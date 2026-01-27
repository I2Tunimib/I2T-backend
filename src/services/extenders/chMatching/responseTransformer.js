export default async (req, res) => {
  console.log("=== CH Matching Response Transformer ===");

  // Get column from original request (not processed, to ensure we have all rows)
  const column_to_extend = Object.keys(req.original.items)[0];
  console.log(`Column to extend: ${column_to_extend}`);

  // Get all original row IDs that were sent in the request
  const originalRowIds = req.original.items[column_to_extend]
    ? Object.keys(req.original.items[column_to_extend])
    : [];
  console.log(`Total rows in original request: ${originalRowIds.length}`);
  console.log(`Sample original row IDs:`, originalRowIds.slice(0, 5));

  // Log the structure of the response from the service
  console.log(`Response structure: Array.isArray(res)=${Array.isArray(res)}`);
  if (Array.isArray(res)) {
    console.log(`Response length: ${res.length}`);
    if (res.length > 0) {
      console.log(`Response[0] is array: ${Array.isArray(res[0])}`);
      if (Array.isArray(res[0])) {
        console.log(`Response[0] length: ${res[0].length}`);
        console.log(
          `Sample response items:`,
          res[0].slice(0, 3).map((item) => ({
            row: item?.row,
            hasData: !!item,
            keys: item ? Object.keys(item) : [],
          })),
        );
      }
    }
  }

  let response = {
    columns: {},
    meta: {},
  };

  // Define all the properties we want to extract from the CH Matching response
  const properties = [
    "selected_company",
    "selected_company_number",
    "selected_address",
    "search_score",
    "classification",
    "classification_name",
    "reasoning",
    "confidence",
    "total_search_results",
  ];

  properties.forEach((prop) => {
    let label_column = "SNMX_" + column_to_extend + "_" + prop;
    let colEntity = [];
    let colProperty = [];
    let colType = [];

    // Set metadata based on property type
    switch (prop) {
      case "original_supplier":
      case "selected_company":
        colEntity = [
          {
            name: "company",
            id: "wd:Q4830453",
            score: 100,
            match: true,
          },
        ];
        colProperty = [
          {
            id: "wd:P144",
            obj: column_to_extend,
            match: true,
            name: "based on",
            score: 100,
          },
        ];
        colType = [
          {
            id: "wd:Q4830453",
            name: "company",
            match: true,
            score: 100,
          },
        ];
        break;

      case "selected_company_number":
        colEntity = [
          {
            name: "identifier",
            id: "wd:Q6545185",
            score: 100,
            match: true,
          },
        ];
        colProperty = [
          {
            id: "wd:P144",
            obj: column_to_extend,
            match: true,
            name: "based on",
            score: 100,
          },
        ];
        colType = [
          {
            id: "wd:Q6545185",
            name: "identifier",
            match: true,
            score: 100,
          },
        ];
        break;

      case "original_address":
      case "selected_address":
        colEntity = [
          {
            name: "address",
            id: "wd:Q319608",
            score: 100,
            match: true,
          },
        ];
        colProperty = [
          {
            id: "wd:P144",
            obj: column_to_extend,
            match: true,
            name: "based on",
            score: 100,
          },
        ];
        colType = [
          {
            id: "wd:Q319608",
            name: "address",
            match: true,
            score: 100,
          },
        ];
        break;

      case "search_score":
      case "classification":
      case "total_search_results":
        colEntity = [
          {
            name: "number",
            id: "wd:Q1164991",
            score: 100,
            match: true,
          },
        ];
        colProperty = [
          {
            id: "wd:P144",
            obj: column_to_extend,
            match: true,
            name: "based on",
            score: 100,
          },
        ];
        colType = [
          {
            id: "wd:Q1164991",
            name: "number",
            match: true,
            score: 100,
          },
        ];
        break;

      case "confidence":
        colEntity = [
          {
            name: "confidence level",
            id: "wd:Q1063053",
            score: 100,
            match: true,
          },
        ];
        colProperty = [
          {
            id: "wd:P144",
            obj: column_to_extend,
            match: true,
            name: "based on",
            score: 100,
          },
        ];
        colType = [
          {
            id: "wd:Q1063053",
            name: "confidence level",
            match: true,
            score: 100,
          },
        ];
        break;

      default:
        colEntity = [
          {
            name: "string",
            id: "wd:Q29934246",
            score: 100,
            match: true,
          },
        ];
        colProperty = [
          {
            id: "wd:P144",
            obj: column_to_extend,
            match: true,
            name: "based on",
            score: 100,
          },
        ];
        colType = [
          {
            id: "wd:Q29934246",
            name: "string",
            match: true,
            score: 100,
          },
        ];
    }

    // Initialize column
    response.columns[label_column] = {
      label: label_column,
      kind: "literal",
      metadata: [],
      cells: {},
    };

    response.columns[label_column].metadata.push({
      id: label_column,
      name: label_column,
      entity: colEntity,
      type: colType,
      property: colProperty,
    });

    /**
     * Ensure all rows are present in the output (including non-reconciled ones).
     * First initialize all cells for the target column with empty values, then
     * overwrite them with any data returned by the CH Matching API.
     */
    const allRowIds =
      req.original && req.original.items && req.original.items[column_to_extend]
        ? Object.keys(req.original.items[column_to_extend])
        : [];

    // Initialize every row with an empty value so non-reconciled rows are included
    allRowIds.forEach((rId) => {
      response.columns[label_column].cells[rId] = { label: "", metadata: [] };
    });

    // Overwrite defaults with actual responses from the service (if any)
    if (Array.isArray(res[0])) {
      res[0].forEach((row) => {
        const value =
          row[prop] !== undefined && row[prop] !== null
            ? String(row[prop])
            : "";
        response.columns[label_column].cells[row["row"]] = {
          label: value,
          metadata: [],
        };
      });
    }
  });

  console.log("=== CH Matching Response Transformer Complete ===");
  console.log(`Total columns created: ${Object.keys(response.columns).length}`);
  Object.keys(response.columns).forEach((colName) => {
    const cellCount = Object.keys(response.columns[colName].cells).length;
    console.log(`  ${colName}: ${cellCount} cells`);
  });

  return response;
};
