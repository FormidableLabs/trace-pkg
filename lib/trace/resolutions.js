"use strict";

/**
 * Dynamic resolution functions and helpers.
 */
const path = require("path");

// Gather, merge, and normalize resolution configurations.
const normalizeResolutions = ({ cwd, resolutions }) => Object.entries(resolutions)
  .reduce((memo, [resKey, resVal]) => {
    // Expand application sources to full path.
    resKey = resKey.startsWith(".") ? path.resolve(cwd, resKey) : resKey;
    memo[resKey] = resVal || [];
    return memo;
  }, {});

module.exports = {
  normalizeResolutions
};
