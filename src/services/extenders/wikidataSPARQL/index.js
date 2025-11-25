export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true,
  },
  public: {
    name: "SPARQL (Wikidata)",
    relativeUrl: "/wikidata/entities",
    description: 'An extender that executes SPARQL queries on Wikidata for the entities in the selected column.<br><br>' +
      '<strong>Input</strong>: A <em>reconciled column</em> with Wikidata entities; plus the variables and body of the ' +
      'SPARQL query. Specify the variables for the SELECT clause (e.g., <code>?elevation ?unit ?unitLabel' +
      '</code>). The variable <code>?item</code> is automatically included with the values from the selected column. ' +
      'Provide the body of the query (e.g., <code>?item wdt:P2044 ?elevation</code>). The VALUES clause is automatically ' +
      'added. Optionally, specify ORDER BY and LIMIT clauses.<br>' +
      '<strong>Output</strong>: A new column for each selected variable containing the retrieved property values ' +
      'for each entity, returned as strings or numbers according to Wikidata property types.<br><br>' +
      '<strong>Notes</strong>: Some properties may be missing for certain entities in Wikidata. ' +
      'Ensure variable names correspond to properties used in the query body.',
    formParams: [
      {
        id: "variables",
        description:
          "<strong>Write your SPARQL query</strong><br> SELECT ?item <italic>*variables*</italic>",
        label: "*variables* for the query with format ?xxx",
        inputType: "text",
        rules: ["required"],
      },
      {
        id: "body",
        description: "WHERE { VALUES { ... } <italic>*body*</italic> }",
        label: "*body* of the query:",
        inputType: "textArea",
        rules: ["required"],
      },
      {
        id: "order",
        description: "ORDER BY (optional)",
        inputType: "text",
      },
      {
        id: "limit",
        description: "LIMIT (optional)",
        inputType: "text",
      },
    ],
  },
};
