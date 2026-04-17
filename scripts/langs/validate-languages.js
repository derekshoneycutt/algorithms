#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_FILE_PATH = path.join(REPO_ROOT, "templates", "languages.source.json");
const SCHEMA_FILE_PATH = path.join(REPO_ROOT, "templates", "languages.schema.json");
const ROOT_ICON_DIR = path.join(REPO_ROOT, "icons");
const EXTENSION_ICON_DIR = path.join(REPO_ROOT, "extension", "icons", "languages");

/**
 * Reads JSON from a file path.
 *
 * @param {string} filePath Absolute file path.
 * @returns {any} Parsed JSON object.
 */
function readJsonFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(text);
}

/**
 * Builds Ajv validator for one schema.
 *
 * @returns {(value: any) => boolean} Compiled validator function.
 */
function buildSchemaValidator() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);
  const schema = readJsonFile(SCHEMA_FILE_PATH);
  return ajv.compile(schema);
}

/**
 * Formats Ajv errors for console output.
 *
 * @param {import("ajv").ErrorObject[] | null | undefined} errors Ajv errors.
 * @returns {string[]} Formatted error lines.
 */
function formatAjvErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return [];
  }

  return errors.map((error) => {
    const instancePath = error.instancePath || "/";
    const message = error.message || "schema validation error";
    return `${instancePath}: ${message}`;
  });
}

/**
 * Verifies uniqueness constraints for language keys/extensions.
 *
 * @param {{languages?: Array<{key?: string, extension?: string}>}} source Parsed source object.
 * @returns {string[]} Validation error messages.
 */
function validateLanguageUniqueness(source) {
  const errors = [];
  const keys = new Set();
  const extensions = new Set();

  if (!Array.isArray(source.languages)) {
    return ["languages must be an array for custom invariant checks"];
  }

  for (const language of source.languages) {
    const key = String(language.key || "").trim();
    const extension = String(language.extension || "").trim().toLowerCase();

    if (keys.has(key)) {
      errors.push(`duplicate language key: ${key}`);
    }
    keys.add(key);

    if (extensions.has(extension)) {
      errors.push(`duplicate language extension: ${extension}`);
    }
    extensions.add(extension);
  }

  return errors;
}

/**
 * Validates icon mapping completeness and file presence.
 *
 * @param {{languages?: Array<{key?: string, icon?: {fileName?: string}}>} } source Parsed source object.
 * @returns {string[]} Validation error messages.
 */
function validateIconAssignments(source) {
  const errors = [];

  if (!Array.isArray(source.languages)) {
    return ["languages must be an array for icon checks"];
  }

  for (const language of source.languages) {
    const key = String(language.key || "").trim();
    const iconFileName = String(language.icon?.fileName || "").trim();

    if (!iconFileName) {
      errors.push(`missing icon assignment for language: ${key}`);
      continue;
    }

    const rootIconPath = path.join(ROOT_ICON_DIR, iconFileName);
    const extensionIconPath = path.join(EXTENSION_ICON_DIR, iconFileName);

    if (!fs.existsSync(rootIconPath)) {
      errors.push(`missing root icon file for ${key}: ${path.relative(REPO_ROOT, rootIconPath)}`);
    }

    if (!fs.existsSync(extensionIconPath)) {
      errors.push(`missing extension icon file for ${key}: ${path.relative(REPO_ROOT, extensionIconPath)}`);
    }
  }

  return errors;
}

/**
 * Runs full source validation and prints results.
 *
 * @returns {number} Process exit code.
 */
function runValidation() {
  try {
    const source = readJsonFile(SOURCE_FILE_PATH);
    const validateSchema = buildSchemaValidator();

    const schemaValid = validateSchema(source);
    const schemaErrors = schemaValid ? [] : formatAjvErrors(validateSchema.errors);
    const uniquenessErrors = validateLanguageUniqueness(source);
    const iconErrors = validateIconAssignments(source);

    const allErrors = [...schemaErrors, ...uniquenessErrors, ...iconErrors];

    if (allErrors.length > 0) {
      console.error("Language metadata validation failed:");
      for (const error of allErrors) {
        console.error(`- ${error}`);
      }
      return 1;
    }

    console.log("Language metadata validation passed.");
    console.log(`languages: ${Array.isArray(source.languages) ? source.languages.length : 0}`);
    return 0;
  } catch (error) {
    console.error("Language metadata validation failed with runtime error:");
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exit(runValidation());
