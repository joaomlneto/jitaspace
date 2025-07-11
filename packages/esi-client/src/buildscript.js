import { writeFileSync } from "fs";
import path, { join } from "path";
import { fileURLToPath } from "url";

// Workaround for ESM import in Node.js
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// get the current date in YYYY-MM-DD format
const esiCurrentDateString = new Date(new Date().getTime() - 11 * 3600 * 1000)
  .toISOString()
  .split("T")[0];

// write build data to build-data.json
writeFileSync(
  join(__dirname, "build-data.json"),
  JSON.stringify(
    {
      buildDate: esiCurrentDateString,
    },
    null,
    2,
  ),
  "utf-8",
);
