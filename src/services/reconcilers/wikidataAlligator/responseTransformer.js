import config from "./index.js";
import fs from "fs";

function extractIdRow(inputString) {
  const dollarIndex = inputString.indexOf("$");
  if (dollarIndex !== -1) {
    const idRow = inputString.substring(1, dollarIndex);
    return Number(idRow);
  } else {
    return -1;
  }
}
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created: ${dirPath}`);
  }
}

export default async (req, res) => {
  const { result, labelDict, error } = res;
  const outputDir = "../../fileSemTUI";
  ensureDirectoryExists(outputDir);
  fs.writeFile(
    "../../fileSemTUI/response-Alligator.json",
    JSON.stringify(result),
    function (err) {
      if (err) throw err;
      console.log("File ../../fileSemTUI/response-Alligator.json saved!");
    },
  );
  const { items } = req.original;
  const prefix = config.public.prefix;
  const { cea, cta, cpa } = result.semanticAnnotations;
  console.log("content of semanti annotations", result.semanticAnnotations);
  // console.log(`*** response alligator *** items: ${JSON.stringify(items)}`);
  // console.log(`*** response alligator *** cea: ${JSON.stringify(cea)}`);
  const response = [];
  const usedCols = result.originalColumns;
  const originalColsCta = cta.find((item) => item.idColumn === 0);
  const origianlColTypes = originalColsCta ? originalColsCta.types : [];

  // NOTE: the header properties are not addressed by the frontend, types are computed by the frontend
  const header = {
    id: items.find((item) => !item.id.includes("$")).id,
    metadata: [
      {
        id: `${prefix}:Q35120`,
        description: "anything that can be considered, discussed, or observed",
        match: true,
        name: "entity",
        score: 1,
        type: origianlColTypes
          .filter((type) => type.id !== "Q1229013")
          .map((type) => ({ match: false, ...type })),
        property: [
          {
            id: `${prefix}:P131`,
            name: "located in the administrative territorial entity",
            obj: "State",
            match: true,
            score: 100,
          },

          ...cpa
            .filter((propGroup) => propGroup.idSourceColumn === 0)
            .flatMap((propAnnotations) => {
              const sourceName = usedCols[propAnnotations.idSourceColumn];
              const targetName = usedCols[propAnnotations.idTargetColumn];
              let newProps = [];
              for (let prop of propAnnotations.predicates) {
                newProps.push({
                  id: `${prefix}:${prop.id}`,
                  name: prop.name,
                  obj: targetName,
                  match: true,
                  score: prop.score,
                });
              }
              return newProps;
            }),
        ],
      },
    ],
  };
  // console.log(`*** response alligator *** header: ${JSON.stringify(header)}`)
  response.push(header);

  for (let mention of items) {
    let idRow = extractIdRow(mention.id);
    // console.log(`*** response alligator *** idRow: ${JSON.stringify(idRow)}`);
    if (idRow !== -1) {
      const foundObj = cea.find(
        (obj) => obj.idRow === idRow + 1 && obj.idColumn === 0,
      );
      // console.log(`*** response alligator *** foundObj: ${JSON.stringify(foundObj)}`);
      if (foundObj !== undefined) {
        const metadata = foundObj.entities;
        let semTUIMetadata = metadata
          .filter((meta) => meta.id !== "Q1229013")
          .map(({ delta, features, types, name, ...rest }) => ({
            ...rest,
            type: (types || [])
              .filter((t) => t.id)
              .map((t) => ({ ...t, id: `${prefix}:${t.id}` })),
            id: `${prefix}:${rest.id}`,
            name: {
              value: name,
              uri: `https://www.wikidata.org/entity/${rest.id}`,
            },
          }));

        const cellAnnotation = {
          id: mention.id,
          metadata: semTUIMetadata,
        };
        // console.log(`*** response alligator *** foundObj.entities: ${JSON.stringify(foundObj.entities)}`);
        response.push(cellAnnotation);
      } else {
        // No CEA entry for this cell — push empty metadata so the frontend doesn't show N/A
        response.push({ id: mention.id, metadata: [] });
      }
    }
  }
  // Check if no reconciliation results were found
  const hasResults = response.some((item) => {
    if (item.id && item.metadata && item.metadata.length > 0) {
      // For cells, check if any metadata has match
      return item.metadata.some((meta) => meta.match);
    }
    return false;
  });

  if (!hasResults) {
    res.error = req.config.errors.reconciler["02"];
  }

  return { ...response, error: res.error };
};
