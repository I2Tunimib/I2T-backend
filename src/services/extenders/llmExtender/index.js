export default {
  private: {
    endpoint: process.env.LLM_ADDRESS,
    processRequest: true,
  },
  public: {
    name: "LLM Extender",
    relativeUrl: "",
    allValues: true,
    description:
      "A flexible LLM-powered extender that processes your data using a custom prompt. " +
      "Define your own columns and instructions for how the LLM should analyze and extend your data.<br><br>" +
      "<strong>Input</strong>: Your data rows and a custom prompt describing how to process them.<br>" +
      "<strong>Output</strong>: New columns with LLM-generated content based on your instructions.<br><br>" +
      "<strong>How to use:</strong><br>" +
      "1. Specify output column names (comma-separated, e.g., 'summary, category, sentiment')<br>" +
      "2. Write instructions for what to do with the cell data. The LLM will receive both your instructions AND the actual cell data<br>" +
      "3. For each column, specify what value should be returned<br><br>" +
      "<strong>Example:</strong><br>" +
      "Columns: <code>length, first_word, last_word</code><br>" +
      "Prompt: <code>Count the characters and return as 'length'. Extract the first word as 'first_word' and the last word as 'last_word'.</code>",
    formParams: [
      {
        id: "columnNames",
        description:
          "Enter comma-separated names for the new columns (e.g., 'summary, category, sentiment'):",
        label: "Output column names",
        inputType: "text",
      },
      {
        id: "prompt",
        description:
          "Write instructions for processing the cell data. The LLM will automatically receive the cell content. Be specific about what each output column should contain:",
        label: "Processing prompt",
        inputType: "textArea",
      },
    ],
  },
};
