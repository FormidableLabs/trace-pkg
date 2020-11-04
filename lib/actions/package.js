"use strict";

const fs = require("fs");
const path = require("path");

const makeDir = require("make-dir");
const archiver = require("archiver");
const { traceFiles } = require("trace-deps");

const { parseConfig } = require("../config");

// Helper: Make sorted array unique.
const uniq = (val, i, arr) => i === 0 || val !== arr[i - 1];

const createZip = async ({ cwd, outputPath, files }) => {
  // Ensure bundle directory.
  await makeDir(path.dirname(outputPath));

  // Create zip.
  const zip = archiver.create("zip");
  const output = fs.createWriteStream(bundlePath);
};

// TODO: Features / core to implement
// - [ ] TODO: Report
// - [ ] TODO: `cwd`
// - [ ] TODO: Sort and make unique for individual entries in a zip file.
// - [ ] TODO: Error if no files matched.
const createPackage = async ({ opts: { config } = {} } = {}) => {
  const plan = await parseConfig({ config });

  const zips = {};
  // TODO: Implement concurrency limits.
  await Promise.all(Object.keys(plan).map(async (key) => {
    const { cwd, output, trace, include } = plan[key];

    const outputPath = path.resolve(cwd, output);
    const tracePaths = trace.map((file) => path.resolve(cwd, file));
    const includePaths = include.map((file) => path.resolve(cwd, file));

    const { dependencies, missed } = await traceFiles({
      srcPaths: tracePaths,
      ignores: [], // TODO: IMPLEMENT `trace.ignores`
      allowMissing: {}, // TODO: IMPLEMENT `trace.allowMissing`
      extraImports: {}, // TODO: IMPLEMENT `trace.dynamic.resolutions`
      bailOnMissing: true // TODO: Consider/ticket adding to misses and displaying together.
    });

    const tracedPaths = dependencies.map((file) => path.resolve(cwd, file));
    const files = []
      .concat(
        tracePaths,
        includePaths,
        tracedPaths
      )
      .sort()
      .filter(uniq);

    // TODO: Use for reporting?
    zips[key] = {
      plan: plan[key],
      resolved: {
        trace: tracePaths,
        traced: tracedPaths,
        include: includePaths
      },
      missed,
      output: {
        cwd,
        outputPath,
        files
      }
    };

    // Create output directory and bundle.
    await createZip({ cwd, outputPath, files });
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
