"use strict";

const path = require("path");

const { toPosix } = require("./path");

/**
 * Helpers for dealing with packages.
 */

// // Read package.json version from disk
// const getVersion = async (filePath = "") => {
//     if
// };

// Extract top-level package name + relative file path from full path.
//
// E.g., `backend/node_modules/pkg1/node_modules/pkg2/index.js` =>
// {
//   name: "pkg2",
//   file: pkg2/index.js
// }
const getPackageNameFromPath = (filePath = "") => {
  const parts = toPosix(path.normalize(filePath)).split("/");
  const nodeModulesIdx = parts.lastIndexOf("node_modules");
  if (nodeModulesIdx === -1) { return null; }

  // Get first part of package.
  const firstPart = parts[nodeModulesIdx + 1];
  if (!firstPart) { return null; }

  // Default to unscoped.
  let name = firstPart;
  if (firstPart[0] === "@") {
    // Detect if scoped and adjust / short-circuit if no match.
    const secondPart = parts[nodeModulesIdx + 2]; // eslint-disable-line no-magic-numbers
    if (!secondPart) { return null; }

    name = [firstPart, secondPart].join("/");
  }

  return {
    name,
    file: parts.slice(nodeModulesIdx + 1).join(path.sep)
  };
};

module.exports = {
  getPackageNameFromPath
};
