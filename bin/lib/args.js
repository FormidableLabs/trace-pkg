"use strict";

const fs = require("fs");
const { promisify } = require("util");

const readFile = promisify(fs.readFile);

const yargs = require("yargs/yargs");
const yaml = require("yaml");

const { version } = require("../../package.json");
const NAME = "trace-pkg";

const getArgs = async (args) => {
  args = args || yargs.hideBin(process.argv);

  // Parse
  const parsed = yargs(args)
    .usage(`Usage: ${NAME} [options]`)
    // Files
    .option("config", {
      alias: "c",
      describe: "Path to configuration file",
      type: "string"
    })
    // Logistical
    .exitProcess(false)
    .help().alias("help", "h")
    .version(version).alias("version", "v")
    .strict();

  // Validate
  const { argv } = parsed;
  const opts = {
    help: !!argv.help,
    version: !!argv.version
  };

  // Convert config file to full object.
  if (typeof argv.config !== "undefined") {
    try {
      const buf = await readFile(argv.config);
      // TODO: Handle JS, JSON with `require()`.
      opts.config = yaml.parse(buf.toString());
    } catch (err) {
      // Enhance message.
      err.message = `Failed to load --config file"${argv.config}" with error: ${err.message}`;
      throw err;
    }
  }

  return {
    opts
  };
};

module.exports = {
  NAME,
  getArgs
};
