export default {
  private: {
    endpoint: process.env.WD_SPARQL,
    processRequest: true,
  },
  public: {
    name: "SPARQL (Wikidata)",
    relativeUrl: "/wikidata/entities",
    description:
      "SPARQL queries to extract properties from wikidata for the entities in the selected column" +
      " <br> Add the <italic>*variables*</italic> for the query (e.g., ?elevation ?unit ?unitLabel). <br>" +
      "The variable ?item is automatically added  with values in the selected column. <br>" +
      "Then add the <italic>*body*</italic> of the query (e.g., ?item wdt:P2044 ?elevation .) <br>" +
      "The VALUES clause is automatically added. <br>" +
      "Note that some required properties may be missing in Wikidata.",
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
