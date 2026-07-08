import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "I2T API",
      version: "1.0.0",
      description: "REST API for the I2T semantic table annotation platform",
    },
    servers: [{ url: "/api", description: "Default server" }],
    components: {
      parameters: {
        idDataset: {
          in: "path",
          name: "idDataset",
          required: true,
          schema: { type: "string" },
          description: "Dataset ID",
        },
        idTable: {
          in: "path",
          name: "idTable",
          required: true,
          schema: { type: "string" },
          description: "Table ID",
        },
        opId: {
          in: "path",
          name: "opId",
          required: true,
          schema: { type: "string" },
          description: "Operation ID",
        },
      },
      schemas: {
        Dataset: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            userId: { type: "integer" },
            visibility: { type: "string", enum: ["public", "private"] },
            viewers: { type: "array", items: { type: "integer" } },
            editors: { type: "array", items: { type: "integer" } },
          },
        },
        ServiceDescriptor: {
          type: "object",
          description: "Public metadata for a reconciler, extender, or modifier",
          properties: {
            id: { type: "string", description: "Service key used in requests" },
            name: { type: "string" },
            description: { type: "string" },
            uri: { type: "string", description: "Endpoint URI of the external service" },
          },
        },
        ReconciliationItem: {
          type: "object",
          required: ["id", "label"],
          properties: {
            id: {
              type: "string",
              description: "Cell ID (`rowId$colId`) or column header ID",
            },
            label: { type: "string", description: "Text value to reconcile" },
          },
        },
        ReconciliationRequest: {
          type: "object",
          required: ["serviceId", "items"],
          properties: {
            serviceId: {
              type: "string",
              description: "Reconciler ID (must match a configured reconciler key)",
              example: "lamapi",
            },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/ReconciliationItem" },
            },
            tableId: { type: "string" },
            datasetId: { type: "string" },
            columnName: { type: "string" },
          },
        },
        ReconciliationResponse: {
          type: "object",
          description: "Service-specific result; structure varies by reconciler",
          properties: {
            columns: { type: "object" },
            rows: { type: "object" },
            dependencies: {
              type: "object",
              description: "Present only when X-Table-Dataset-Info header was sent",
            },
          },
        },
        AutomaticAnnotationRequest: {
          type: "object",
          required: ["target", "method"],
          properties: {
            target: {
              type: "string",
              enum: ["fullTable", "schema"],
            },
            method: {
              type: "string",
              enum: ["alligator", "llmClassifier", "llmColumnClassifier", "llm"],
            },
            useLLM: { type: "boolean" },
          },
        },
        TableMeta: {
          type: "object",
          properties: {
            id: { type: "string" },
            idDataset: { type: "string" },
            name: { type: "string" },
            nCells: { type: "integer" },
            nCellsReconciliated: { type: "integer" },
            complianceStatus: {
              type: "string",
              enum: ["PENDING", "DONE", "ERROR"],
              nullable: true,
            },
            lastModifiedDate: { type: "string", format: "date-time" },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Local JWT issued by /auth/signin or /auth/signup",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "kc_access_token",
          description: "Keycloak access token set as HTTP-only cookie after PKCE flow",
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/*.route.js")],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
