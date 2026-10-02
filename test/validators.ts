import { readFileSync } from "node:fs";
import Ajv from "ajv";

const schema = (file: string) =>
  JSON.parse(readFileSync(new URL(`../schemas/${file}`, import.meta.url), "utf-8"));

// Microsoft's published schema contains duplicate enum values, which Ajv's meta-schema check rejects,
// and non-standard keywords; neither affects validating our output against it.
const ajv = new Ajv({
  strict: false,
  validateSchema: false,
  allErrors: true,
  formats: { "uri-reference": true },
});

export const validatePowerBi = ajv.compile(schema("powerbi-theme-2.157.json"));
export const validateTableau = ajv.compile(schema("tableau-theme-1.0.0.json"));
