"use strict";

/**
 * Dynamic resolution functions and helpers.
 */
const path = require("path");

const { smartMerge } = require("../util/object");

// Gather, merge, and normalize resolution configurations.
const configToResolutions = (cwd, optsResolutions, pkgResolutions) =>
  Object.entries(smartMerge(optsResolutions, pkgResolutions))
    .reduce((memo, [resKey, resVal]) => {
      // Expand application sources to full path.
      resKey = resKey.startsWith(".") ? path.resolve(cwd, resKey) : resKey;
      memo[resKey] = resVal || [];
      return memo;
    }, {});

module.exports = {
  configToResolutions
};
