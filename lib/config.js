"use strict";

const globby = require("globby");
const GLOBBY_OPTS = {}; // TODO: MORE OPTIONS!

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
      pkgCfg.trace ? globby(pkgCfg.trace, GLOBBY_OPTS) : Promise.resolve(),
      pkgCfg.include ? globby(pkgCfg.include, GLOBBY_OPTS) : Promise.resolve()
    ]);

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
