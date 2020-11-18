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

// Extract a file path root package, if any
const getBasePkg = ({ filePath }) => {
  const parts = path.normalize(filePath).split(path.sep);

  if (parts[0] === "node_modules") {
    // eslint-disable-next-line no-magic-numbers
    if (parts.length >= 2 && parts[1][0] === "@") {
      // Scoped.
      // eslint-disable-next-line no-magic-numbers
      return parts.slice(1, 2).join(path.sep);
    } else if (parts.length >= 1 && parts[1][0] !== "@") {
      // Unscoped.
      return parts[1];
    }
  }

  return null;
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

// Summarize collapsed files for more efficient reporting.
const summarizeCollapsed = ({ collapsed }) => {
  const summary = {
    sources: {},
    dependencies: {}
  };
  Object.entries(collapsed).forEach(([filePath, dups]) => {
    const basePkg = getBasePkg({ filePath });
    if (basePkg) {
      summary.dependencies[basePkg] = summary.dependencies[basePkg] || {
        files: {}
      };
      summary.dependencies[basePkg].files[filePath] = dups;
    } else {
      summary.sources[filePath] = dups;
    }
  });

  return summary;
};

module.exports = {
  findCollapsed,
  summarizeCollapsed
};
