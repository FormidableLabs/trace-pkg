"use strict";

const { traceFiles } = require("trace-deps");

const { parseConfig } = require("../config");

// TODO: Features / core to implement
// - [ ] TODO: Report
// - [ ] TODO: `cwd`
// - [ ] TODO: Sort and make unique for individual entries in a zip file.
// - [ ] TODO: Error if no files matched.
const createPackage = async ({ opts: { config } = {} } = {}) => {
  const plan = await parseConfig({ config });

  const zips = {};
  await Promise.all(Object.keys(plan).map(async (key) => {
    const { trace, include } = plan[key];

    const traced = await traceFiles({
      srcPaths: trace,
      ignores: [], // TODO: IMPLEMENT `trace.ignores`
      allowMissing: {}, // TODO: IMPLEMENT `trace.allowMissing`
      extraImports: {}, // TODO: IMPLEMENT `trace.dynamic.resolutions`
      bailOnMissing: true // TODO: Consider/ticket adding to misses and displaying together.
    });

    zips[key] = {
      trace: {
        include: trace,
        ...traced
      },
      include
    };

    // TODO: Actually zip
  }));

  // TODO: IMPLEMENT
  // eslint-disable-next-line no-console
  console.log(require("util").inspect({
    msg: "TODO: IMPLEMENT PACKAGE",
    config,
    zips
  }, {
    colors: true,
    depth: null
  }));
};

module.exports = {
  "package": createPackage
};
