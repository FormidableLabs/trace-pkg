"use strict";

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const makeDir = require("make-dir");
const archiver = require("archiver");
const { traceFiles } = require("trace-deps");

const { parseConfig } = require("../config");

const EPOCH = new Date(0);

// Make sorted array unique.
const uniq = (val, i, arr) => i === 0 || val !== arr[i - 1];

// File helpers
const readStat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

const createZip = async ({ cwd, outputPath, files }) => {
  // Ensure bundle directory.
  await makeDir(path.dirname(outputPath));

  // Gather all file data.
  //
  // Possible performance improvements:
  // See: https://github.com/FormidableLabs/serverless-jetpack/issues/75
  const fileObjs = await Promise.all(files.map(
    (filePath) => Promise.all([
      readFile(filePath),
      readStat(filePath)
    ])
      .then(([data, stat]) => ({
        name: path.relative(cwd, filePath),
        data,
        stat
      }))
  ));

  // Create zip.
  const zip = archiver.create("zip");
  const output = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => { // eslint-disable-line promise/avoid-new
    output.on("close", () => resolve());
    output.on("error", reject);
    zip.on("error", reject);

    output.on("open", () => {
      zip.pipe(output);

      // Add all files.
      fileObjs.forEach(({ name, data, stat: { mode } }) => {
        // Manually read and set date for deterministic bundles.
        //
        // See: https://github.com/FormidableLabs/serverless-jetpack/issues/7
        zip.append(data, {
          name,
          mode,
          date: EPOCH
        });
      });

      zip.finalize();
    });
  });
};

const bundle = async ({ config }) => {
  const plan = await parseConfig({ config });

  // TODO: Implement concurrency limits.
  // TODO: Implement worker off main thread.
  const report = {};
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

    report[key] = {
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

  return report;
};

module.exports = {
  bundle
};
