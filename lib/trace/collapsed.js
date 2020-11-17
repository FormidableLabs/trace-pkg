"use strict";

/**
 * Collapsed file functions and helpers.
 */
const path = require("path");

// Return what the zip destination _collapsed_ path will be.
const getCollapsedPath = ({ cwd, filePath }) => {
  const parts = path.relative(cwd, path.normalize(filePath)).split(path.sep);

  // Remove leading `..`.
  while (parts[0] === "..") {
    parts.shift();
  }

  return parts.join(path.sep);
};

const findCollapsed = ({ cwd, files }) => {
  // Convert to lookup table of collapsed zip paths.
  const collapsedMap = files.reduce((memo, filePath) => {
    const collapsedPath = getCollapsedPath({ cwd, filePath });
    memo[collapsedPath] = (memo[collapsedPath] || []).concat(filePath);
    return memo;
  }, {});

  // Remove non-duplicates.
  Object.entries(collapsedMap).forEach(([collapsedPath, entries]) => {
    if (entries.length < 2) { // eslint-disable-line no-magic-numbers
      delete collapsedMap[collapsedPath];
    }
  });

  return collapsedMap;
};

module.exports = {
  findCollapsed
};
