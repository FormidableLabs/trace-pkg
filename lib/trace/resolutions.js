"use strict";

/**
 * Dynamic resolution functions and helpers.
 */
const path = require("path");

const { toPosix } = require("../util/path");
const { getPackageNameFromPath } = require("../util/package");

// Evaluate misses and separate into resolved and missed objects.
//
// - Application sources are determined via being an absolute path
//   (which typically means produced by `normalizeFileKeys()`).
const resolveMisses = ({ misses = {}, resolutions = {} } = {}) => {
  // Lookup tables with full, normalized paths for all resolutions.
  const resKeys = new Set(Object.keys(resolutions)
    .map((f) => toPosix(path.normalize(f)))
  );

  // Populate results.
  const results = { resolved: [], missed: {} };
  Object.entries(misses).forEach(([key, missList]) => {
    const pkg = getPackageNameFromPath(key);
    const missPath = toPosix(path.normalize(pkg ? pkg.file : key));
    if (resKeys.has(missPath)) {
      results.resolved.push(key);
    } else {
      results.missed[key] = missList;
    }
  });

  return results;
};

module.exports = {
  resolveMisses
};
