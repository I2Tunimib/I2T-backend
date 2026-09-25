/**
 * dpv-registry.js
 *
 * Maps pipeline operations to W3C Data Privacy Vocabulary (DPV) processing
 * categories (https://dpvcg.org/) without touching individual reconciler/
 * extender/modifier configs.
 *
 * Resolution order:
 *  1. DPV_SERVICE_OVERRIDES[serviceId] — only needed when a specific service
 *     deviates from what its operationType would otherwise imply (e.g. a
 *     MODIFICATION that actually calls out to a third-party API).
 *  2. DPV_DEFAULTS[operationType] — generic fallback so every operation gets
 *     a baseline classification even before it has a dedicated override.
 */

export const DPV_DEFAULTS = {
  RECONCILIATION: {
    processing: ["dpv:Consult", "dpv:Transfer"],
    thirdParty: true,
  },
  EXTENSION: {
    processing: ["dpv:Transfer", "dpv:Combine"],
    thirdParty: true,
  },
  MODIFICATION: {
    processing: ["dpv:Adapt"],
    thirdParty: false,
  },
  PROPAGATE_TYPE: {
    processing: ["dpv:Structure"],
    thirdParty: false,
  },
  EXPORT: {
    processing: ["dpv:Transfer"],
    thirdParty: false,
  },
  SAVE_TABLE: {
    processing: ["dpv:Store"],
    thirdParty: false,
  },
};

// Only add an entry here when a specific serviceId needs to deviate from
// its operationType's default above.
export const DPV_SERVICE_OVERRIDES = {
  // Example: a modifier that sends data to an external LLM API is a
  // MODIFICATION but still involves a third-party transfer.
  // llmModifier: {
  //   processing: ["dpv:Transfer", "dpv:Adapt"],
  //   recipient: "<llm-endpoint>",
  //   thirdParty: true,
  // },
};

/**
 * Resolve the DPV classification for a given operation log entry.
 * @param {object} op - a processed operation entry (has operationType and
 *   one of reconciler/extender/modifier)
 * @returns {{processing: string[], thirdParty: boolean, recipient?: string} | null}
 */
export function resolveDpv(op) {
  const serviceId = op.reconciler || op.extender || op.modifier;
  return (
    (serviceId && DPV_SERVICE_OVERRIDES[serviceId]) ||
    DPV_DEFAULTS[op.operationType] ||
    null
  );
}

const DPV_CONTEXT = {
  dpv: "https://w3id.org/dpv#",
  prov: "http://www.w3.org/ns/prov#",
};

/**
 * Build a JSON-LD record describing one operation's DPV/PROV-O metadata.
 * @param {object} op
 * @param {{processing: string[], thirdParty: boolean, recipient?: string}} dpv
 */
export function buildDpvJsonLd(op, dpv) {
  const serviceId = op.reconciler || op.extender || op.modifier;
  // Older log entries predate the id/opNumber fields, so fall back to a
  // stable composite key rather than embedding "undefined" in the URI.
  const opIdentifier =
    op.id ??
    op.opNumber ??
    `${op.operationType}-${op.columnName || "na"}-${op.timestamp}`;
  return {
    "@context": DPV_CONTEXT,
    "@id": `urn:semtui:op:${opIdentifier}`,
    "@type": "dpv:Processing",
    "dpv:hasProcessing": dpv.processing,
    ...(op.columnName
      ? { "prov:used": `urn:semtui:column:${op.columnName}` }
      : {}),
    ...(serviceId ? { "prov:wasAssociatedWith": serviceId } : {}),
    ...(dpv.recipient
      ? { "dpv:hasRecipient": { "@id": dpv.recipient } }
      : {}),
    ...(dpv.thirdParty ? { "dpv:isThirdPartyProcessing": true } : {}),
    "prov:startedAtTime": op.timestamp,
  };
}
