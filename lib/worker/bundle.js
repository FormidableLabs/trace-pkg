"use strict";

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const makeDir = require("make-dir");
const archiver = require("archiver");
const { traceFiles } = require("trace-deps");

const { smartConcat } = require("../util/array");
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
const getFileData = ({ files, fileCache, allowNotFound = false }) =>
  Promise.all(files.map(async (filePath) => {
    if (typeof fileCache[filePath] !== "undefined") {
      return fileCache[filePath];
    }

    // Read serially to allow first read to fail if file not found.
    const data = await readFile(filePath)
      .catch((err) => {
        if (err.code === "ENOENT" && allowNotFound) { return null; }
        throw err;
      });
    const stat = data ? await readStat(filePath) : null;

    fileCache[filePath] = {
      filePath,
      data,
      stat
    };

    return fileCache[filePath];
  }));

// Helper for just file and source maps gathering.
const getFileAndSourceMapsData = async ({
  cwd,
  tracePaths,
  includePaths,
  tracedPaths,
  sourceMaps = []
}) => {
  // Gather all file data.
  const fileCache = {};
  const matchedFiles = smartConcat(tracePaths, tracedPaths, includePaths);
  const matchedFilesSet = new Set(matchedFiles);
  const fileObjs = await getFileData({
    files: matchedFiles,
    fileCache
  });

  // Merge / filter source map paths.
  const sourceMapMisses = [];
  const sourceMapPaths = [];
  const sourceMapAllPaths = smartConcat(sourceMaps
    .map((file) => path.resolve(cwd, file))
    // Remove all previously inferred files.
    .filter((file) => !matchedFilesSet.has(file))
  );
  const sourceMapAllObjs = await getFileData({
    files: sourceMapAllPaths,
    fileCache,
    allowNotFound: true
  });
  sourceMapAllObjs.forEach(({ filePath, data, stat }) => {
    // Ignore not found source map files.
    if (data === null) {
      sourceMapMisses.push(filePath);
      return;
    }

    fileObjs.push({ filePath, data, stat });
    sourceMapPaths.push(filePath);
  });

  // Re-sort file objects and extract file paths.
  // They are already unique because we only added non-unique source map paths.
  fileObjs.sort((a, b) => a.filePath.localeCompare(b.filePath));

  return {
    fileObjs,
    sourceMapPaths,
    sourceMapMisses
  };
};

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
  // Trace.
  const tracePaths = trace.map((file) => path.resolve(cwd, file));
  const { dependencies, sourceMaps, misses } = await traceFiles({
    srcPaths: tracePaths,
    includeSourceMaps,
    ignores,
    allowMissing,
    extraImports: resolutions,
    bailOnMissing: true // TODO: Consider/ticket adding to misses and displaying together.
  });

  // Get file data.
  const includePaths = include.map((file) => path.resolve(cwd, file));
  const tracedPaths = dependencies.map((file) => path.resolve(cwd, file));
  const { fileObjs, sourceMapPaths, sourceMapMisses } = await getFileAndSourceMapsData({
    tracePaths,
    includePaths,
    tracedPaths,
    sourceMaps
  });
  const files = fileObjs.map(({ filePath }) => filePath);

  // Create output directory and bundle.
  const outputPath = path.resolve(cwd, output);
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
    misses: {
      ...resolveMisses({ misses, resolutions }),
      sourceMaps: sourceMapMisses
    },
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
