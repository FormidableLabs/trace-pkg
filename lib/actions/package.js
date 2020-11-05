"use strict";

const { log } = require("../log");
const { bundle } = require("../worker/bundle");


// TODO: Features / core to implement
// - [ ] TODO: Report
// - [ ] TODO: Implement concurrency limits.
// - [ ] TODO: Implement worker off main thread.
const createPackage = async ({ opts: { config } = {} } = {}) => {
  const report = await bundle({ config });

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
