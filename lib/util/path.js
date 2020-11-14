"use strict";

/**
 * Path helpers.
 */

// Simple conversion to produce Linux/Mac style forward slash-based paths.
const toPosix = (file) => !file ? file : file.replace(/\\/g, "/");

module.exports = {
  toPosix
};
