"use strict";

// TODO: const Worker = require("jest-worker").default;
const chalk = require("chalk");
const yaml = require("yaml");

const { parseConfig } = require("../config");
const { log } = require("../log");
const { bundle } = require("../worker/bundle");

const bundleReport = ({ concurrency, config, results }) => {
  const configStr = yaml.stringify({
    concurrency,
    config
  })
    .replace(/^([^ ]{1}.*):/gm, (_, v1) => chalk `{green ${v1}}:`)
    .replace(/^([ ]{2}[^ ]{1}.*):/gm, (_, v1) => chalk `{gray ${v1}}:`);

  const reportStr = yaml.stringify(results)
    .replace(/^([^ ]{1}.*):/gm, (_, v1) => chalk `\n{cyan ${v1}}:`)
    .replace(/^([ ]{2}[^ ]{1}.*):/gm, (_, v1) => chalk `{green ${v1}}:`)
    .replace(/^([ ]{4}[^ ]{1}.*):/gm, (_, v1) => chalk `{gray ${v1}}:`);

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
  // TODO: Implement worker off main thread.
  const results = {};
  await Promise.all(Object.entries(plan.packages).map(async ([key, pkg]) => {
    const { cwd, output, trace, include } = pkg;
    const bundleResults = await bundle({ cwd, output, trace, include, dryRun });
    results[key] = Object.assign({ plan: pkg }, bundleResults);
  }));

  if (report) {
    log(bundleReport({ concurrency, config, results }));
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
