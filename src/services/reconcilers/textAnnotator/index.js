export default {
  private: {
    endpoint: process.env.TEXT_ANNOTATOR,
    processRequest: true,
  },
  public: {
    name: "Text Annotation: NER (GateNLP)",
    description:
      "Annotates text cells with named entity spans using a GateNLP-based annotator. " +
      "Returns W3C <em>TextPositionSelector</em> annotations (character offsets) for each entity mention " +
      "found in the cell text, and links entities to Wikidata candidates.",
    relativeUrl: "/annotate/w3c",
    prefix: "wd",
    uri: "https://www.wikidata.org/wiki/",
    searchPattern: "https://www.wikidata.org/w/index.php?search={label}",
    searchTypesPattern: "https://www.wikidata.org/w/index.php?search={label}",
    formParams: [],
  },
};
