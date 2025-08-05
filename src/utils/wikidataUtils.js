import axios from "axios";

const ALLOWED_PREFIXES = ["wd:", "wdA:", "wda:"];
/**
 * Fetches the English Wikidata description and type label ("instance of") for a given Wikidata ID.
 *
 * The ID must start with one of the allowed prefixes: "wd:", "wdA:", or "wda:".
 * The function extracts the Q-ID, queries the Wikidata API for the entity,
 * and then queries for the type label if available.
 *
 * @param {string} wdId - The Wikidata ID, e.g., 'wdA:Q52844354'
 * @returns {Promise<{description: string, type: string}>} An object containing the description and type label.
 * @throws {Error} If the ID does not have an allowed prefix or is not a valid Wikidata Q-ID.
 *
 * @example
 * const info = await fetchWikidataInformation('wdA:Q52844354');
 * console.log(info.description); // English description from Wikidata
 * console.log(info.type);        // English label of the entity's type
 */
export async function fetchWikidataInformation(wdId) {
  const prefix = ALLOWED_PREFIXES.find((p) => wdId.startsWith(p));
  if (!prefix) {
    return {
      wikidataDescription: "",
      wikidataType: "",
    };
  }
  const match = wdId.match(/Q\d+/);
  if (!match) {
    return {
      wikidataDescription: "",
      wikidataType: "",
    };
  }
  const wikidataId = match[0];
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
  const response = await axios.get(url);
  const entity = response.data.entities[wikidataId];

  // Get description (default to English)
  const description = entity.descriptions?.en?.value || "";

  // Get type label (P31: instance of)
  let typeLabel = "";
  if (
    entity.claims?.P31 &&
    entity.claims.P31[0]?.mainsnak?.datavalue?.value?.id
  ) {
    const typeId = entity.claims.P31[0].mainsnak.datavalue.value.id;
    // Fetch type label
    const typeUrl = `https://www.wikidata.org/wiki/Special:EntityData/${typeId}.json`;
    const typeResp = await axios.get(typeUrl);
    typeLabel = typeResp.data.entities[typeId].labels?.en?.value || "";
  }
  return {
    wikidataDescription: description,
    wikidataType: typeLabel,
  };
}
