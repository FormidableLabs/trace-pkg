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
const parseConfig = async ({
  config: { packages = {}, options = {} } = {},
  concurrency
} = {}) => {
  // Validate.
  if (!Object.keys(packages).length) {
    throw new Error("Must specify 1+ packages to create");
  }

  // Set concurrency
  if (typeof concurrency === "undefined") {
    concurrency = typeof options.concurrency !== "undefined" ? options.concurrency : 1;
  }

  const plan = {
    concurrency,
    packages: {}
  };
  await Promise.all(Object.keys(packages).map(async (key) => {
    const pkgCfg = packages[key];
    const cwd = pkgCfg.cwd || options.cwd || process.cwd();
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

    plan.packages[key] = {
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
