import { parse } from "json2csv";
import path from "path";
import fs from "fs";
import axios from "axios";
import { SemtParserService } from "./semtparser.service.js";
import { buildHtmlReport, buildMarkdownReport } from '../../../utils/schemaReportUtils.js';

const ExportService = {
  schema_w3c: async ({ columns, rows, tableInstance }) => {
    const jsonData = await ExportService.w3c({
      columns,
      rows,
      tableInstance,
      keepMatching: false
    });
    return jsonData[0] || {};
  },
  report_html: async (payload) => {
    return buildHtmlReport(payload);
  },
  report_md: async (payload) => {
    return buildMarkdownReport(payload);
  },
  rawJson: async ({ columns, rows }) => {
    // Be defensive: rows or individual row.cells may be missing. Produce one object per row
    // using the available column labels. Missing cell values produce empty string.
    const colKeys = Object.keys(columns || {});
    return Object.keys(rows || {}).map((rowId) => {
      const row = rows[rowId] || {};
      const cells = row.cells || {};

      return colKeys.reduce((acc, colId) => {
        const colLabel =
          columns[colId] && columns[colId].label ? columns[colId].label : colId;
        const cell = cells[colId] || {};
        const cellLabel =
          cell && cell.label !== undefined && cell.label !== null
            ? cell.label
            : "";
        acc[colLabel] = cellLabel;
        return acc;
      }, {});
    });
  },
  csv: async ({
    columns,
    rows,
    delimiter,
    quote,
    decimalSeparator,
    includeHeader,
  }) => {
    const jsonData = await ExportService.rawJson({ columns, rows });
    const includeHeaderFlag =
      includeHeader === true || includeHeader === "true";
    let csv = parse(jsonData, {
      delimiter,
      quote,
      header: includeHeaderFlag,
      decimal: decimalSeparator,
    });
    if (decimalSeparator === ".") {
      csv = csv.replace(/(\d+)\,(\d+)/g, `$1${decimalSeparator}$2`);
    }
    return csv;
  },
  w3c: async ({ columns, rows, tableInstance = {}, keepMatching = false }) => {
    // Helper function to convert score strings to numbers in type/property arrays
    const convertScoresInArray = (arr) => {
      if (!Array.isArray(arr)) return arr;
      return arr.map((item) => {
        if (item && typeof item === "object") {
          return {
            ...item,
            ...(item.score !== undefined && { score: parseFloat(item.score) }),
          };
        }
        return item;
      });
    };

    const getMetadata = (metadata = [], keepMatching) => {
      if (keepMatching) {
        return metadata
          .filter((meta) => meta.match)
          .map(({ name, score, type, property, ...rest }) => ({
            name: name.value,
            ...(score !== undefined && { score: parseFloat(score) }),
            ...(type && { type: convertScoresInArray(type) }),
            ...(property && { property: convertScoresInArray(property) }),
            ...rest,
          }));
      }
      return metadata.map(({ name, score, type, property, ...rest }) => ({
        name: name.value,
        ...(score !== undefined && { score: parseFloat(score) }),
        ...(type && { type: convertScoresInArray(type) }),
        ...(property && { property: convertScoresInArray(property) }),
        ...rest,
      }));
    };
    const complianceReports = tableInstance?.complianceReports;
    const firstRow = {
      compliance: {
        service: (complianceReports && complianceReports.length > 0)
          ? complianceReports?.[tableInstance.complianceReports.length - 1]?.serviceName
          : "",
        status: (complianceReports && complianceReports.length > 0)
          ? complianceReports[complianceReports.length - 1]?.result[0]?.table?.gdpr
          : "",
        reasoning: (complianceReports && complianceReports.length > 0)
          ? complianceReports[complianceReports.length - 1]?.result[0]?.table?.reasoning
          : "",
        score: (complianceReports && complianceReports.length > 0)
          ? complianceReports[complianceReports.length - 1]?.result[0]?.table?.score
          : "",
      },
      permission: tableInstance?.permission,
      columns: Object.keys(columns || {}).reduce((acc, colId, index) => {
        const col = columns[colId] || {};
        const {
          id,
          status,
          context = {},
          metadata = [],
          annotationMeta,
          compliance,
          ...propsToKeep
        } = col;

        const trimmedLabel = (col.label || String(colId)).trim();

        // Guard context: it may be undefined or not an object
        const standardContext = Object.keys(context || {}).reduce(
          (accCtx, prefix) => {
            const entry = context[prefix] || {};
            const uri = entry.uri;
            return [...accCtx, { prefix: `${prefix}:`, uri }];
          },
          [],
        );

        // Process column metadata safely
        let processedMetadata = [];
        if (Array.isArray(metadata) && metadata.length > 0) {
          const metaItem = { ...metadata[0] };

          // Convert scores in type array
          if (metaItem.type) {
            metaItem.type = convertScoresInArray(metaItem.type);
          }

          // Convert scores in property array
          if (metaItem.property) {
            metaItem.property = convertScoresInArray(metaItem.property);
          }

          // Convert scores in entity array
          if (metaItem.entity) {
            metaItem.entity = getMetadata(metaItem.entity, keepMatching);
          }

          processedMetadata = [metaItem];
        }

        const lastReport = complianceReports?.[complianceReports.length - 1];
        const latestCompliance = lastReport?.result.find(r => r[trimmedLabel])?.[trimmedLabel];

        acc[`th${index}`] = {
          ...propsToKeep,
          label: trimmedLabel,
          metadata: processedMetadata,
          context: standardContext,
          compliance: latestCompliance || col.compliance,
        };
        return acc;
      }, {})
    };

    const rest = Object.keys(rows || {}).map((rowId) => {
      const row = rows[rowId] || {};
      const cells = row.cells || {};
      // Iterate over the column keys to ensure consistent order and presence even if a cell is missing.
      const colKeys = Object.keys(columns || {});
      return colKeys.reduce((acc, colId) => {
        const cell = cells[colId] || {};
        const { id, metadata = [], annotationMeta, ...propsToKeep } = cell;
        const trimmedLabel = (
          columns[colId] && columns[colId].label ? columns[colId].label : colId
        ).trim();

        acc[trimmedLabel] = {
          ...propsToKeep,
          metadata: getMetadata(metadata, keepMatching),
        };
        return acc;
      }, {});
    });

    return [firstRow, ...rest];
  },
  rdf: async ({ columns, rows, serialization, baseUri, score, match }) => {
    const rdf_endpoint = process.env.RDF_EXPORT_ENDPOINT;
    const jsonData = await ExportService.w3c({
      columns,
      rows,
      keepMatching: true,
    });
    console.log("**** json data", serialization, baseUri, score, match);
    const payload = {
      json_data: jsonData,
      base_uri: baseUri,
      match_value: match, // or "all" or "only_true"
      score_value: score, // minimum score threshold
      format: serialization, // Options: TURTLE, NTRIPLES, TRIG, NQUADS, TRIX, JSON, XML
    };
    const response = await axios.post(rdf_endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 second timeout
    });
    if (serialization === "JSON") {
      return JSON.stringify(response.data);
    } else {
      return response.data;
    }
  },
  semtParser: async ({ id, datasetId, format = "python" }) => {
    const logFilePath = path.join(
      process.cwd(),
      "public",
      "logs",
      `logs-${datasetId}-${id}.jsonl`,
    );
    if (!fs.existsSync(logFilePath)) {
      throw new Error(
        `Log file not found for dataset ${datasetId} and table ${id}`,
      );
    }
    return SemtParserService.generate({
      datasetId,
      tableId: id,
      format: format === "notebook" ? "notebook" : "python",
    });
  },
};

export default ExportService;
