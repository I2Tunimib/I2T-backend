import { Log } from "../api/services/logger/Log.js";
import DatasetsService from "../api/services/datasets/datasets.service.js";

export async function generateSotwCsv({ id, datasetId }) {
  if (!id || !datasetId) {
    throw new Error(`Missing parameters for sotwCsv: datasetId=${datasetId}, tableId=${id}`);
  }

  const tableMeta = await DatasetsService.findOneTable(datasetId, id);
  const tableName = tableMeta?.name;

  const headers = [
    "http://www.w3.org/ns/odrl/2/dateTime",
    "http://www.w3.org/ns/odrl/2/Party",
    "http://www.w3.org/ns/odrl/2/Action",
    "http://www.w3.org/ns/odrl/2/Asset",
    "http://w3id.org/dpv#hasTechnique",
  ];

  const actionMap = {
    MODIFICATION: "http://www.w3.org/ns/odrl/2/modify",
    RECONCILIATION: "http://www.w3.org/ns/odrl/2/reconcile",
    EXTENSION: "http://www.w3.org/ns/odrl/2/extend",
    PROPAGATE_TYPE: "http://www.w3.org/ns/odrl/2/modify",
    EXPORT: "http://www.w3.org/ns/odrl/2/use",
  };

  const csvRows = [];

  try {
    const log = new Log(datasetId, id);
    log.buildDependencyGraph();
    const logObj = log.getObject();
    const operations = logObj?.operations || [];
    console.log(`[sotwCsv] Total operations found in log: ${operations.length}`);

    const relevantTypes = new Set(Object.keys(actionMap));
    const relevantOps = operations.filter((o) => relevantTypes.has(o.operationType));

    for (const op of relevantOps) {
      const rawOpType = (op.operationType || "").trim().toUpperCase();
      const service = op.reconciler || op.extender || op.modifier || op.service || "unknown";
      const dateTime = op.timestamp || new Date().toISOString();

      const actionUri =
        actionMap[rawOpType] || `http://www.w3.org/ns/odrl/2/${rawOpType.toLowerCase()}`;
      const partyUri = `https://w3id.org/dpv/owl#User`;
      const assetUri = `${tableName}/${op.columnName}`;

      const row = [dateTime, partyUri, actionUri, assetUri, service].map((val) =>
        String(val).includes(",") ? `"${val}"` : val
      );
      csvRows.push(row.join(","));
    }
  } catch (err) {
    console.error("[sotwCsv] Error reading operations for sotwCsv:", err);
  }

  return [headers.join(","), ...csvRows].join("\n");
}

export async function evaluatePolicySotw(policy, sotw) {
  const policyEngineUrl = process.env.POLICY_ENGINE_API_URL;
  const response = await fetch(`${policyEngineUrl}/evaluate_policy_on_sotw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ policy: policy, sotw: sotw }),
  });

  return await response.json();
}

export async function shaclValidator(policy) {
  const policyEngineUrl = process.env.POLICY_ENGINE_API_URL;
  const response = await fetch(`${policyEngineUrl}/validate_ODRL`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ odrl: policy }),
  });

  return await response.json();
}