"use strict";

/**
 * Path helpers.
 */
const path = require("path");

// Simple conversion to produce Linux/Mac style forward slash-based paths.
const toPosix = (file) => !file ? file : file.replace(/\\/g, "/");

// Gather, merge, and normalize object keys that might be an application source
// or package name.
//
// - Relative paths ("application sources") are resolved to absolute path.
//   `./foo/bar.js` => `/FULL/PATH/TO/foo/bar.js`
// - Absolute paths are untouched.
// - Package names are untouched.
const normalizeFileKeys = ({
  cwd = process.cwd(),
  map = {}
} = {}) => Object.entries(map)
  .reduce((memo, [appOrPkg, val]) => {
    // Default: absolute paths or package names.
    let key = appOrPkg;

    // Expand application sources to full path.
    if (appOrPkg.startsWith(".")) {
      key = path.normalize(path.resolve(cwd, key));
    }

    // Update object.
    memo[key] = val || [];
    return memo;
  }, {});

module.exports = {
  toPosix,
  normalizeFileKeys
};
