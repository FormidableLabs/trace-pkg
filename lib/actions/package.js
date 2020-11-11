"use strict";

const chalk = require("chalk");
const yaml = require("yaml");
const Worker = require("jest-worker").default;

const { parseConfig } = require("../config");
const { debuglog, log, warn } = require("../log");
const debug = debuglog("trace-pkg:package");
const { serial } = require("../util/promise");
const { bundle } = require("../worker/bundle");

const highlight = (indent, color, prefix = "") => [
  new RegExp(`^([ ]{${indent}}[^ ]{1}.*):`, "gm"),
  (_, val) => chalk `${prefix}{${color} ${val}}:`
];

const handleMisses = (results) => {
  Object.entries(results).forEach(([key, result]) => {
    if (Object.keys(result.misses || {}).length) {
      const missStr = Object.entries(result.misses)
        .map(([missFile, missList]) =>
          chalk `- {yellow ${missFile}}\n  {gray ${missList.join("\n  ")}}`
        )
        .join("\n");

      warn(chalk `Dynamic misses in {cyan ${key}}:\n${missStr}`);
    }
  });
};

const prettyResults = (results) => {
  // Deep copy the results so we can mutate.
  results = JSON.parse(JSON.stringify(results));
  Object.values(results).forEach((result) => {
    if (result.misses) {
      Object.entries(result.misses).forEach(([missFile, missList]) => {
        // Prettify miss sources.
        result.misses[missFile] = missList.map(
          ({ src, loc: { start: { line, column } } }) => `[${line}:${column}]: ${src}`
        );
      });
    }
  });

  return results;
};

const bundleReport = ({ config, concurrency, dryRun, results }) => {
  /* eslint-disable no-magic-numbers */
  const configStr = yaml.stringify({
    concurrency,
    dryRun,
    config
  })
    .replace(...highlight(0, "green"))
    .replace(...highlight(2, "gray"));

  const reportStr = yaml.stringify(results)
    .replace(...highlight(0, "cyan", "\n"))
    .replace(...highlight(2, "green"))
    .replace(...highlight(4, "gray"));

  /* eslint-enable no-magic-numbers */
  return chalk `
{blue ## Configuration}

${configStr}
{blue ## Output}
${reportStr}`.trim();
};

const createRunner = ({ concurrency }) => {
  // Run serially in band.
  if (concurrency === 1) {
    return {
      isWorker: false,
      bundle,
      run: serial
    };
  }

  // Run concurrently.
  const worker = new Worker(require.resolve("../worker/bundle"), { numWorkers: concurrency });
  return {
    isWorker: true,
    bundle: worker.bundle,
    run: async (tasks) => {
      await Promise.all(tasks)
        .catch((err) => {
          worker.end();
          throw err;
        });
      worker.end();
    }
  };
};

const createPackage = async ({ opts: { config, concurrency, report, dryRun } = {} } = {}) => {
  const plan = await parseConfig({ config, concurrency });
  concurrency = plan.concurrency;

  // Bundle tasks.
  // Pre-seed results to guarantee key order.
  const rawResults = Object.entries(plan.packages).reduce((memo, [key, pkg]) => {
    memo[key] = { plan: pkg };
    return memo;
  }, {});
  const runner = createRunner({ concurrency });
  await runner.run(Object.entries(plan.packages).map(async ([key, pkg]) => {
    const { cwd, output, trace, traceOptions, include } = pkg;
    debug(chalk `{gray [${runner.isWorker ? "w" : "s"}]} Start bundle for: {cyan ${key}}`);

    const bundleResults = await runner.bundle({
      cwd,
      output,
      trace,
      traceOptions,
      include,
      dryRun
    });

    const { workerId } = bundleResults.output;
    const mode = workerId ? chalk `{gray [w{green ${workerId}}]}` : chalk `{gray [s]}`;
    debug(chalk `${mode} Finished bundle for {cyan ${key}}`);

    // Update results.
    Object.assign(rawResults[key], bundleResults);
  }));

  // Create prettified copy of results for better console output.
  const results = prettyResults(rawResults);

  // Handle error/warn cases.
  handleMisses(results);

  if (report) {
    log(bundleReport({ config, concurrency, dryRun, results }));
  } else {
    if (dryRun) {
      log(chalk `{gray [dry-run]} Would create {green ${Object.keys(results).length}} packages:`);
    } else {
      log(chalk `Created {green ${Object.keys(results).length}} packages:`);
    }

    Object.entries(results).forEach(([key, { output: { relPath, files } }]) => {
      log(chalk `- {cyan ${key}}: ${relPath} ({green ${files.length}} {gray files})`);
    });
  }
};

module.exports = {
  "package": createPackage
};
