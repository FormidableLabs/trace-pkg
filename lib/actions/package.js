"use strict";

const { bundle } = require("../worker/bundle");


// TODO: Features / core to implement
// - [ ] TODO: Report
// - [ ] TODO: Implement concurrency limits.
// - [ ] TODO: Implement worker off main thread.
const createPackage = async ({ opts: { config } = {} } = {}) => {
  await bundle({ config });
};

module.exports = {
  "package": createPackage
};
