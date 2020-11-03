"use strict";

const globby = require("globby");

// TODO: MORE GLOBBING OPTIONS!
// https://github.com/mrmlnc/fast-glob#options-3
// - [ ] cwd (`process.cwd()`)
// - [ ] followSymbolicLinks (`true`)
const GLOBBY_OPTS = {};

// Validate configuration and create final plan.
const parseConfig = async ({ config }) => {
  const plan = {};

  if (!Object.keys((config || {}).packages || {}).length) {
    throw new Error("Must specify 1+ packages to create");
  }

  await Promise.all(Object.keys(config.packages).map(async (key) => {
    const pkgCfg = config.packages[key];

    // Match all trace + include files.
    const [trace, include] = await Promise.all([
      pkgCfg.trace ? globby(pkgCfg.trace, GLOBBY_OPTS) : Promise.resolve([]),
      pkgCfg.include ? globby(pkgCfg.include, GLOBBY_OPTS) : Promise.resolve([])
    ]);

    // Validate have 1+ files to zip.
    if (!(trace.length || include.length)) {
      throw new Error(`Did not find any matching files for bundle: "${key}"`);
    }

    plan[key] = {
      trace,
      include
    };
  }));

  return plan;
};

module.exports = {
  parseConfig
};
