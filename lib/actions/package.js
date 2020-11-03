"use strict";

const { traceFiles } = require("trace-deps");

const { parseConfig } = require("../config");

const createPackage = async ({ opts } = {}) => {
  const config = await parseConfig({ config: opts.config });

  const srcPaths = []; // TODO: IMPLEMENT!!!!

  const { dependencies, misses } = await traceFiles({
    srcPaths,
    ignores: [], // TODO: IMPLEMENT `trace.ignores`
    allowMissing: {}, // TODO: IMPLEMENT `trace.allowMissing`
    extraImports: {}, // TODO: IMPLEMENT `trace.dynamic.resolutions`
    bailOnMissing: true // TODO: Consider/ticket adding to misses and displaying together.
  });

  // TODO: IMPLEMENT
  // eslint-disable-next-line no-console
  console.log(require("util").inspect({
    msg: "TODO: IMPLEMENT PACKAGE",
    config,
    dependencies,
    misses
  }, {
    colors: true,
    depth: null
  }));
};

module.exports = {
  "package": createPackage
};
