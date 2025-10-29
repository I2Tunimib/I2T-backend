import { parse } from "json2csv";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const ExportService = {
  rawJson: async ({ columns, rows }) => {
    return Object.keys(rows).map((rowId) => {
      const colIds = Object.keys(rows[rowId].cells);

      return colIds.reduce((acc, colId) => {
        acc[columns[colId].label] = rows[rowId].cells[colId].label;
        return acc;
      }, {});
    });
  },
  csv: async ({ columns, rows }) => {
    const jsonData = await ExportService.rawJson({ columns, rows });
    return parse(jsonData);
  },
  w3c: async ({ columns, rows, keepMatching = false }) => {
    const getMetadata = (metadata = [], keepMatching) => {
      if (keepMatching) {
        return metadata
          .filter((meta) => meta.match)
          .map(({ name, ...rest }) => ({
            name: name.value,
            ...rest,
          }));
      }
      return metadata.map(({ name, ...rest }) => ({
        name: name.value,
        ...rest,
      }));
    };

    const firstRow = Object.keys(columns).reduce((acc, colId, index) => {
      const { id, status, context, metadata, annotationMeta, ...propsToKeep } =
        columns[colId];

      const trimmedLabel = columns[colId].label.trim();

      const standardContext = Object.keys(context).reduce((accCtx, prefix) => {
        const { uri } = context[prefix];
        return [...accCtx, { prefix: `${prefix}:`, uri }];
      }, []);

      acc[`th${index}`] = {
        ...propsToKeep,
        label: trimmedLabel,
        metadata:
          metadata.length > 0
            ? [
                {
                  ...metadata[0],
                  ...(metadata[0].entity && {
                    entity: getMetadata(metadata[0].entity, keepMatching),
                  }),
                },
              ]
            : [],
        context: standardContext,
      };
      return acc;
    }, {});

    const rest = Object.keys(rows).map((rowId) => {
      const { cells } = rows[rowId];
      return Object.keys(cells).reduce((acc, colId) => {
        const { id, metadata, annotationMeta, ...propsToKeep } = cells[colId];
        const trimmedLabel = columns[colId].label.trim();

        acc[trimmedLabel] = {
          ...propsToKeep,
          metadata: getMetadata(metadata, keepMatching),
        };
        return acc;
      }, {});
    });

    return [firstRow, ...rest];
  },
  semtParser: async ({ id, datasetId, format = "python" }) => {
    return new Promise((resolve, reject) => {
      let outputFilePath = null;
      try {
        // Get the log file path for the dataset and table
        const logFilePath = path.join(
          process.cwd(),
          "public",
          "logs",
          `logs-${datasetId}-${id}.log`,
        );

        // Check if log file exists
        if (!fs.existsSync(logFilePath)) {
          return reject(
            new Error(
              `Log file not found for dataset ${datasetId} and table ${id}`,
            ),
          );
        }

        // Just use a simple default table name - the user will change it anyway when running the code
        const tableFilePath = "table_1.csv";

        // Path to semTParser executable (should be in public folder)
        const semtParserPath = path.join(process.cwd(), "public", "semTParser");

        // Generate output filename with timestamp
        const timestamp = new Date()
          .toISOString()
          .replace(/:/g, "-")
          .replace(/\..+/, "");
        const outputFileName =
          format === "python"
            ? `base_file_${timestamp}.py`
            : `base_notebook_file_${timestamp}.ipynb`;

        // Execute semTParser
        const semtParser = spawn(semtParserPath, [
          "--log-file",
          logFilePath,
          "--table-file",
          tableFilePath,
          "--format",
          format,
        ]);

        let outputData = "";
        let errorData = "";

        semtParser.stdout.on("data", (data) => {
          outputData += data.toString();
        });

        semtParser.stderr.on("data", (data) => {
          errorData += data.toString();
        });

        semtParser.on("close", (code) => {
          if (code !== 0) {
            console.error(`semTParser exited with code ${code}`);
            console.error(`Error output: ${errorData}`);
            return reject(
              new Error(`semTParser failed with code ${code}: ${errorData}`),
            );
          }

          // Extract file path from semTParser output
          const outputMatch = outputData.match(/file created at: (.+)$/m);
          if (!outputMatch || !outputMatch[1]) {
            return reject(
              new Error(
                "Could not determine output file path from semTParser output",
              ),
            );
          }

          outputFilePath = outputMatch[1].trim();

          // Read the generated file with proper encoding
          fs.readFile(outputFilePath, "utf8", (err, data) => {
            if (err) {
              // Clean up the file even if we couldn't read it
              if (outputFilePath) {
                fs.unlink(outputFilePath, () => {
                  console.log(
                    `Cleaned up file after read error: ${outputFilePath}`,
                  );
                });
              }
              return reject(
                new Error(`Failed to read generated file: ${err.message}`),
              );
            }

            // Schedule file deletion with a slight delay to ensure response is complete
            setTimeout(() => {
              fs.unlink(outputFilePath, (unlinkErr) => {
                if (unlinkErr) {
                  console.warn(
                    `Warning: Failed to delete temporary file ${outputFilePath}: ${unlinkErr.message}`,
                  );
                } else {
                  console.log(
                    `Successfully deleted temporary file: ${outputFilePath}`,
                  );
                }
              });
            }, 1000); // 1 second delay to ensure response is complete

            // Return the file content and metadata
            resolve({
              data,
              fileName: outputFileName,
              filePath: outputFilePath,
              contentType:
                format === "python" ? "text/x-python" : "application/json",
            });
          });
        });
      } catch (error) {
        // Clean up the output file if it exists and we encounter an error
        if (outputFilePath && fs.existsSync(outputFilePath)) {
          try {
            fs.unlinkSync(outputFilePath);
            console.log(`Cleaned up file after error: ${outputFilePath}`);
          } catch (cleanupError) {
            console.warn(
              `Failed to clean up file: ${outputFilePath}`,
              cleanupError,
            );
          }
        }
        reject(error);
      }
    });
  },
};

export default ExportService;
