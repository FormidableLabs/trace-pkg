/* eslint-disable no-console */

"use strict";

const { yellow, red } = require("chalk");
const { debuglog } = require("util");

let enabled = true;

const setLoggingOptions = async (opts) => {
  enabled = !opts.silent;
};

const log = (...args) => enabled && console.log(...args);

const warn = (...args) => enabled && console.log(yellow("WARN"), ...args);

const error = (...args) => enabled && console.error(red("ERROR"), ...args);

module.exports = {
  debuglog,
  log,
  warn,
  error,
  setLoggingOptions
};
