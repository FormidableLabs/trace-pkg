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

const createPackage = async ({ opts: { config, concurrency, report, dryRun } = {} } = {}) => {
  const plan = await parseConfig({ config, concurrency });
  concurrency = plan.concurrency;

  // TODO: Implement concurrency limits.
  // - [ ] TODO: Check 0
  // - [ ] TODO: Check 1
  // - [ ] TODO: Check other numbers?
  // TODO: Implement worker off main thread.

  // Bundle tasks.
  let worker;
  const results = {};
  const tasks = Object.entries(plan.packages).map(([key, pkg]) => async () => {
    const { cwd, output, trace, include } = pkg;
    const bundleFn = worker ? worker.bundle : bundle;
    debug(chalk `Start bundle for: {cyan ${key}}`);

    const bundleResults = await bundleFn({ cwd, output, trace, include, dryRun });
    results[key] = Object.assign({ plan: pkg }, bundleResults);
    const { workerId } = bundleResults.output;
    const mode = workerId ? chalk `{gray worker {green ${workerId}}}` : chalk `{gray serial}`;
    debug(chalk `Finished bundle for {cyan ${key}} (${mode})`);
  });

  if (concurrency > 1) {
    // Run concurrently.
    worker = new Worker(require.resolve("../worker/bundle"), {
      numWorkers: concurrency
    });
    await Promise.all(tasks.map((fn) => fn()))
      .catch((err) => {
        worker.end();
        throw err;
      });
    worker.end();
  } else {
    // Run serially in-band.
    await serial(tasks.map((fn) => fn()));
  }

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
