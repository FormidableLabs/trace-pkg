"use strict";

const { expect, use } = require("chai");
const chaiAsPromised = require("chai-as-promised");
const sinonChai = require("sinon-chai");

use(chaiAsPromised);
use(sinonChai);

global.expect = expect;

// Chalk
// Disable chalk colors in tests.
// TODO REMOVE CONDITIONAL
if (!process.env.TEMP_DEV) {
  // eslint-disable-next-line global-require
  const chalk = require("chalk");
  chalk.level = 0;
}

// Early require to get around mock-fs
require("chalk/source/templates");
