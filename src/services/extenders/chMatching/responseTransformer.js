export default async (req, res) => {
  const column_to_extend = Object.keys(req.processed.items)[0];

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

    // Populate cells with data from API response
    res[0].forEach((row) => {
      const value = row[prop] !== undefined ? row[prop].toString() : "";

      response.columns[label_column].cells[row["row"]] = {
        label: value,
        metadata: [],
      };
    });
  });

  return response;
};
