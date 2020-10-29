#!/usr/bin/env node
"use strict";

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const BIN_NAME = "trace-pkg";

const ACTIONS = {
  "package": async ({ opts }) => {
    // TODO: IMPLEMENT
    // eslint-disable-next-line no-console
    console.log("TODO: IMPLEMENT PACKAGE", { opts });
  }
};

// ============================================================================
// Helpers
// ============================================================================
// TODO: REMOVE? const log = (...args) => console.log(...args); // eslint-disable-line no-console
const error = (...args) => console.error(...args); // eslint-disable-line no-console

const getArgs = (args) => {
  args = args || hideBin(process.argv);

  // Parse
  const parsed = yargs(args)
    .usage(`Usage: ${BIN_NAME} -a <action> [options]`)
    // Actions
    .option("action", {
      alias: "a",
      choices: Object.keys(ACTIONS),
      describe: "Action to take",
      "default": "package",
      type: "string"
    })
    .example(`${BIN_NAME} -a package TODO_REST_OF_EXAMPLE`)
    // TODO: Other examples? Report?
    // Logistical
    .help().alias("help", "h")
    .version().alias("version", "v")
    .strict();

  // Validate
  const { argv } = parsed;
  const opts = argv;

  return {
    action: ACTIONS[parsed.argv.action],
    opts
  };
};

// ============================================================================
// Script
// ============================================================================
const cli = async ({ args } = {}) => {
  const { action, opts } = getArgs(args);

  await action({ opts });
};

if (require.main === module) {
  cli().catch((err) => {
    error(err);
    process.exit(1); // eslint-disable-line no-process-exit
  });
}

module.exports = {
  cli
};
