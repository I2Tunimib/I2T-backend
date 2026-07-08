export default {
  private: {
    endpoint: process.env.TEXT_ANNOTATOR,
    processRequest: false,
  },
  public: {
    name: "Text Annotation: NER (GateNLP)",
    description:
      "Annotates long-text cells with named entity spans using a GateNLP-based annotator. " +
      "Returns W3C <em>TextPositionSelector</em> annotations (character offsets) for each entity mention " +
      "found in the cell text, stored under the <code>annotations</code> field in W3C compliant format.",
    relativeUrl: "/annotate/w3c",
    skipFiltering: true,
    formParams: [],
  },
};
