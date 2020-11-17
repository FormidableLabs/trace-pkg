"use strict";

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const makeDir = require("make-dir");
const archiver = require("archiver");
const { traceFiles } = require("trace-deps");

const { uniq } = require("../util/array");
const { resolveMisses } = require("../trace/resolutions");
const { findCollapsed } = require("../trace/collapsed");

const EPOCH = new Date(0);

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

const bundle = async ({
  cwd,
  output,
  trace,
  include,
  traceOptions: {
    ignores = [],
    allowMissing = {},
    dynamic: { resolutions = {} }
  } = {},
  dryRun
}) => {
  const outputPath = path.resolve(cwd, output);
  const tracePaths = trace.map((file) => path.resolve(cwd, file));
  const includePaths = include.map((file) => path.resolve(cwd, file));

  const { dependencies, misses } = await traceFiles({
    srcPaths: tracePaths,
    ignores,
    allowMissing,
    extraImports: resolutions,
    bailOnMissing: true // TODO: Consider/ticket adding to misses and displaying together.
  });

  // Gather files for zipping.
  const tracedPaths = dependencies.map((file) => path.resolve(cwd, file));
  const files = []
    .concat(tracePaths, includePaths, tracedPaths)
    .sort()
    .filter(uniq);

  // Create output directory and bundle.
  if (!dryRun) {
    await createZip({ cwd, outputPath, files });
  }

  // Return report.
  return {
    files: {
      trace: tracePaths,
      traced: tracedPaths,
      include: includePaths
    },
    misses: resolveMisses({ misses, resolutions }),
    collapsed: findCollapsed({ cwd, files }),
    output: {
      workerId: process.env.JEST_WORKER_ID || null,
      cwd,
      fullPath: outputPath,
      relPath: path.relative(cwd, outputPath),
      files
    }
  };
};

module.exports = {
  bundle
};
