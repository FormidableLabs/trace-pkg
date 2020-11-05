"use strict";

// TODO: const Worker = require("jest-worker").default;
// TODO: const chalk = require("chalk");

const { parseConfig } = require("../config");
const { log } = require("../log");
const { bundle } = require("../worker/bundle");


// TODO: Features / core to implement
// - [ ] TODO: Report
// - [ ] TODO: Implement concurrency limits.
// - [ ] TODO: Implement worker off main thread.
const createPackage = async ({ opts: { config } = {} } = {}) => {
  const plan = await parseConfig({ config });

  // TODO: Implement concurrency limits.
  // TODO: Implement worker off main thread.
  const report = {};
  await Promise.all(Object.keys(plan).map(async (key) => {
    const { cwd, output, trace, include } = plan[key];
    const results = await bundle({ cwd, output, trace, include });
    report[key] = Object.assign({ plan: plan[key] }, results);
  }));

  // https://github.com/FormidableLabs/trace-pkg/issues/2
  // - [ ] TODO: Convert into full optional report.
  // - [ ] TODO: Make report optional
  log(`Created ${Object.keys(report).length} packages:`);
  Object.keys(report).forEach((key) => {
    log(`- ${key}: ${report[key].output.outputPath} (${report[key].output.files.length} files)`);
  });
};

module.exports = {
  "package": createPackage
};
