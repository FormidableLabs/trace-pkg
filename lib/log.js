"use strict";

const { debuglog } = require("util");

const log = (...args) => console.log(...args); // eslint-disable-line no-console

const error = (...args) => console.error(...args); // eslint-disable-line no-console

module.exports = {
  debuglog,
  log,
  error
};
