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

// Gather file contents and stat data.
//
// If `allowNotFound` and not find file, return `data: null`.
//
// Possible performance improvements:
// See: https://github.com/FormidableLabs/serverless-jetpack/issues/75
const getFileData = ({ files, cache, allowNotFound = false }) =>
  Promise.all(files.map(async (filePath) => {
    if (typeof cache[filePath] !== "undefined") {
      return cache[filePath];
    }

    // Read serially to allow first read to fail if file not found.
    const data = await readFile(filePath)
      .catch((err) => {
        if (err.code === "ENOENT" && allowNotFound) { return null; }
        throw err;
      });
    const stat = data ? await readStat(filePath) : null;

    cache[filePath] = {
      filePath,
      data,
      stat
    };

    return cache[filePath];
  }));

const createZip = async ({ cwd, outputPath, fileObjs }) => {
  // Ensure bundle directory.
  await makeDir(path.dirname(outputPath));

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
      fileObjs.forEach(({ filePath, data, stat: { mode } }) => {
        // Manually read and set date for deterministic bundles.
        //
        // See: https://github.com/FormidableLabs/serverless-jetpack/issues/7
        zip.append(data, {
          name: path.relative(cwd, filePath),
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
    includeSourceMaps = false,
    ignores = [],
    allowMissing = {},
    dynamic: { resolutions = {} }
  } = {},
  dryRun
}) => {
  const outputPath = path.resolve(cwd, output);
  const tracePaths = trace.map((file) => path.resolve(cwd, file));
  const includePaths = include.map((file) => path.resolve(cwd, file));

  const { dependencies, sourceMaps, misses } = await traceFiles({
    srcPaths: tracePaths,
    includeSourceMaps,
    ignores,
    allowMissing,
    extraImports: resolutions,
    bailOnMissing: true // TODO: Consider/ticket adding to misses and displaying together.
  });

  // Gather files for zipping.
  const tracedPaths = dependencies.map((file) => path.resolve(cwd, file));
  const sourceMapPaths = (sourceMaps || []).map((file) => path.resolve(cwd, file));

  // TODO: HERE -- do sourcemaps separately and allowNotFound and filter out.
  // TODO const sourceMapMisses = [];
  const files = []
    .concat(tracePaths, tracedPaths, sourceMapPaths, includePaths)
    .sort()
    .filter(uniq);

  // Gather all file data.
  const fileCache = {};
  const fileObjs = await getFileData({ files, cache: fileCache });

  // Create output directory and bundle.
  if (!dryRun) {
    await createZip({ cwd, outputPath, fileObjs });
  }

  // Return report.
  return {
    files: {
      trace: tracePaths,
      traced: tracedPaths,
      sourceMaps: sourceMapPaths,
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
