import fs from "fs/promises";
import config from "../config/index.js";

async function migrate() {
  const helpers = await config.helpers;
  const datasetDbPath = helpers.getDatasetDbPath();
  console.log("Migrating datasets db at:", datasetDbPath);
  const txt = await fs.readFile(datasetDbPath, "utf8");
  const data = JSON.parse(txt);
  const { meta = {}, datasets = {} } = data;
  let modified = false;
  for (const id of Object.keys(datasets)) {
    const ds = datasets[id];
    if (!ds.visibility) {
      ds.visibility = "private";
      modified = true;
    }
    if (!Array.isArray(ds.viewers)) {
      ds.viewers = [];
      modified = true;
    }
    if (!Array.isArray(ds.editors)) {
      // default editors contain the owner id as string
      ds.editors = [String(ds.userId)];
      modified = true;
    }
  }
  if (modified) {
    await fs.writeFile(datasetDbPath, JSON.stringify({ meta, datasets }, null, 2));
    console.log("Migration applied: added visibility/viewers/editors fields where missing.");
  } else {
    console.log("No migration needed.");
  }
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
