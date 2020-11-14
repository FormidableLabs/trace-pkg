"use strict";

/**
 * Dynamic resolution functions and helpers.
 */
const path = require("path");

const { toPosix } = require("../util/path");
const { getPackage } = require("../util/package");

// Gather, merge, and normalize resolution configurations.
//
// - Relative paths ("application sources") are resolved to absolute path.
const normalizeResolutions = ({
  cwd = process.cwd(),
  resolutions = {}
} = {}) => Object.entries(resolutions)
  .reduce((memo, [resKey, resVal]) => {
    // Expand application sources to full path.
    resKey = resKey.startsWith(".") ? path.normalize(path.resolve(cwd, resKey)) : resKey;
    memo[resKey] = resVal || [];
    return memo;
  }, {});

// Evaluate misses and separate into resolved and missed objects.
//
// - Application sources are determined via being an absolute path
//   (which typically means produced by `normalizeResolutions()`).
const resolveMisses = ({ misses = {}, resolutions = {} } = {}) => {
  // Lookup tables with full, normalized paths for all resolutions.
  const resKeys = new Set(Object.keys(resolutions)
    .map((f) => toPosix(path.normalize(f)))
  );

  // Populate results.
  const results = { resolved: [], missed: {} };
  Object.entries(misses).forEach(([key, missList]) => {
    const pkg = getPackage(key);
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
  normalizeResolutions,
  resolveMisses
};
