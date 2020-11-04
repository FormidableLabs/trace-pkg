"use strict";

const globby = require("globby");

// https://github.com/mrmlnc/fast-glob#options-3
const GLOBBY_OPTS = {
  dot: true,
  onlyFiles: true,
  followSymbolicLinks: true
};

// Glob wrapper
const glob = (patterns, opts) => globby(patterns, Object.assign({}, GLOBBY_OPTS, opts));

// Validate configuration and create final plan.
const parseConfig = async ({ config }) => {
  if (!Object.keys((config || {}).packages || {}).length) {
    throw new Error("Must specify 1+ packages to create");
  }

  const plan = {};
  await Promise.all(Object.keys(config.packages).map(async (key) => {
    const pkgCfg = config.packages[key];
    const cwd = pkgCfg.cwd || config.cwd || process.cwd();
    const output = pkgCfg.output || ((/\.zip$/).test(key) ? key : `${key}.zip`);

    // Match all trace + include files.
    const [trace, include] = await Promise.all([
      pkgCfg.trace ? glob(pkgCfg.trace, { cwd }) : Promise.resolve([]),
      pkgCfg.include ? glob(pkgCfg.include, { cwd }) : Promise.resolve([])
    ]);

    // Validate have 1+ files to zip.
    if (!(trace.length || include.length)) {
      throw new Error(`Did not find any matching files for bundle: "${key}"`);
    }

    plan[key] = {
      cwd,
      output,
      trace,
      include
    };
  }));

  return plan;
};

module.exports = {
  parseConfig
};
