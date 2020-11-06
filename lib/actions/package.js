"use strict";

const chalk = require("chalk");
const yaml = require("yaml");
const Worker = require("jest-worker").default;

const { parseConfig } = require("../config");
const { debuglog, log } = require("../log");
const debug = debuglog("trace-pkg:package");
const { serial } = require("../util/promise");
const { bundle } = require("../worker/bundle");

const highlight = (indent, color, prefix = "") => [
  new RegExp(`^([ ]{${indent}}[^ ]{1}.*):`, "gm"),
  (_, val) => chalk `${prefix}{${color} ${val}}:`
];

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
      bundle,
      run: serial
    };
  }

  // Run concurrently.
  const worker = new Worker(require.resolve("../worker/bundle"), { numWorkers: concurrency });
  return {
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
  const results = {};
  const runner = createRunner({ concurrency });
  await runner.run(Object.entries(plan.packages).map(async ([key, pkg]) => {
    const { cwd, output, trace, include } = pkg;
    debug(chalk `Start bundle for: {cyan ${key}}`);

    const bundleResults = await runner.bundle({ cwd, output, trace, include, dryRun });

    const { workerId } = bundleResults.output;
    const mode = workerId ? chalk `{gray [w{green ${workerId}}]}` : chalk `{gray [s]}`;
    debug(chalk `${mode} Finished bundle for {cyan ${key}}`);

    results[key] = Object.assign({ plan: pkg }, bundleResults);
  }));

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
