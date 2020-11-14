"use strict";

const { yellow, red } = require("chalk");
const { debuglog } = require("util");

const log = (...args) => console.log(...args); // eslint-disable-line no-console

const warn = (...args) => console.log(yellow("WARN"), ...args); // eslint-disable-line no-console

const error = (...args) => console.error(red("ERROR"), ...args); // eslint-disable-line no-console

module.exports = {
  debuglog,
  log,
  warn,
  error
};
