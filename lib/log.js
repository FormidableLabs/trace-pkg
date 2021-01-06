/* eslint-disable no-console */

"use strict";

const { yellow, red } = require("chalk");
const util = require("util");

let _enabled = true;

const setLoggingOptions = ({ silent }) => {
  _enabled = !silent;
};

const debuglog = function (namespace) {
  let debug;

  return (...args) => {
    // Lazy initialize logger.
    if (!debug) {
      debug = util.debuglog(namespace);
    }

    return _enabled && debug(...args);
  };
};

const log = (...args) => _enabled && console.log(...args);

const warn = (...args) => _enabled && console.log(yellow("WARN"), ...args);

const error = (...args) => _enabled && console.error(red("ERROR"), ...args);

module.exports = {
  debuglog,
  log,
  warn,
  error,
  setLoggingOptions
};
