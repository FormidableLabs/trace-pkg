"use strict";

// TODO: const Worker = require("jest-worker").default;
const chalk = require("chalk");
const yaml = require("yaml");

const { parseConfig } = require("../config");
const { log } = require("../log");
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
  const results = {};
  await Promise.all(Object.entries(plan.packages).map(async ([key, pkg]) => {
    const { cwd, output, trace, include } = pkg;
    const bundleResults = await bundle({ cwd, output, trace, include, dryRun });
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
