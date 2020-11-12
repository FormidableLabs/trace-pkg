"use strict";

/**
 * Dynamic resolution functions and helpers.
 */
const path = require("path");

const { toPosix } = require("../util/path");

// Gather, merge, and normalize resolution configurations.
//
// - Relative paths ("application sources") are resolved to absolute path.
const normalizeResolutions = ({ cwd, resolutions }) => Object.entries(resolutions)
  .reduce((memo, [resKey, resVal]) => {
    // Expand application sources to full path.
    resKey = resKey.startsWith(".") ? path.resolve(cwd, resKey) : resKey;
    memo[resKey] = resVal || [];
    return memo;
  }, {});

// Evaluate misses and separate into resolved and missed objects.
//
// - Application sources are determined via being an absolute path
//   (which typically means produced by `normalizeResolutions()`).
const resolveMisses = ({ misses = {}, resolutions = {} } = {}) => {
  const results = {
    missed: {},
    resolved: {}
  };

  // Full, normalized paths for all resolutions for matching.
  const resSrcs = new Set(Object.keys(resolutions)
    .filter((f) => path.isAbsolute(f))
    .map((f) => toPosix(f))
  );

  const resPkgs = new Set(Object.keys(resolutions)
    .filter((f) => !path.isAbsolute(f))
    .map((f) => toPosix(f))
  );

  // TODO: REMOVE
  // eslint-disable-next-line no-console
  console.error(require("util").inspect({
    resSrcs,
    resPkgs,
    misses,
    resolutions
  }, {
    color: true
  }));

  return results;
};

module.exports = {
  normalizeResolutions,
  resolveMisses
};
