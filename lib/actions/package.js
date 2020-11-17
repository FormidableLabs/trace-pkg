"use strict";

const chalk = require("chalk");
const yaml = require("yaml");
const Worker = require("jest-worker").default;

const { parseConfig } = require("../config");
const { debuglog, log, warn, error } = require("../log");
const debug = debuglog("trace-pkg:package");
const { serial } = require("../util/promise");
const { bundle } = require("../worker/bundle");

// ----------------------------------------------------------------------------
// Helpers: Collapsed
// ----------------------------------------------------------------------------
const LINK_COLLAPSED_MISSES = chalk.gray.underline(
  "https://npm.im/trace-pkg#handling-collapsed-files"
);

const logCollapsed = ({ results }) => {
  let foundCollapsed = false;
  Object.entries(results).forEach(([key, { collapsed }]) => {
    const numConflicts = Object.keys(collapsed).length;
    if (numConflicts > 1) {
      foundCollapsed = true;
      const numFiles = Object.values(collapsed).reduce((total, files) => total + files.length, 0);
      const collapsedStr = `- TODO_SUMMARIZE: ${Object.keys(collapsed).join(", ")}`;
      warn(
        chalk `Collapsed files in {cyan ${key}}: `
        + chalk `({gray {red ${numConflicts}} conflicts, {yellow ${numFiles}} files})\n`
        + collapsedStr
      );
    }
  });


  if (foundCollapsed) {
    warn(`To address collapsed file conflicts, see logs & read: ${LINK_COLLAPSED_MISSES}`);
  }
};

const handleCollapsed = ({ packages, results }) => {
  let collapsedError = false;
  Object.entries(packages).map(async ([key, pkg]) => {
    const bail = pkg.collapsed.bail;
    const collapsed = Object.keys(results[key].collapsed);

    if (bail && collapsed.length) {
      collapsedError = true;
      error(chalk `Collapsed file conflicts in {cyan ${key}}: {gray ${JSON.stringify(collapsed)}}`);
    }
  });

  if (collapsedError) {
    error(`Please see logs and read: ${LINK_COLLAPSED_MISSES}`);
    throw new Error("Collapsed file conflicts");
  }
};

// ----------------------------------------------------------------------------
// Helpers: Misses
// ----------------------------------------------------------------------------
const LINK_DYNAMIC_MISSES = chalk.gray.underline(
  "https://npm.im/trace-pkg#handling-dynamic-import-misses"
);

const logMisses = ({ results }) => {
  let foundMisses = false;
  Object.entries(results).forEach(([key, result]) => {
    const missed = (result.misses || {}).missed || {};
    if (Object.keys(missed).length) {
      foundMisses = true;
      const missStr = Object.entries(missed)
        .map(([missFile, missList]) =>
          chalk `- {yellow ${missFile}}\n  {gray ${missList.join("\n  ")}}`
        )
        .join("\n");

      warn(chalk `Dynamic misses in {cyan ${key}}:\n${missStr}`);
    }
  });

  if (foundMisses) {
    warn(`To resolve dynamic import misses, see logs & read: ${LINK_DYNAMIC_MISSES}`);
  }
};

const handleMisses = ({ packages, results }) => {
  let unresolvedError = false;
  Object.entries(packages).map(async ([key, pkg]) => {
    const bail = pkg.traceOptions.dynamic.bail;
    const missed = Object.keys(results[key].misses.missed);

    if (bail && missed.length) {
      unresolvedError = true;
      error(chalk `Unresolved dynamic misses in {cyan ${key}}: {gray ${JSON.stringify(missed)}}`);
    }
  });

  if (unresolvedError) {
    error(`Please see logs and read: ${LINK_DYNAMIC_MISSES}`);
    throw new Error("Unresolved dynamic misses");
  }
};

// ----------------------------------------------------------------------------
// Helpers: Report
// ----------------------------------------------------------------------------
const prettyResults = (results) => {
  // Deep copy the results so we can mutate.
  results = JSON.parse(JSON.stringify(results));
  Object.values(results).forEach((result) => {
    const missed = (result.misses || {}).missed || {};
    Object.entries(missed).forEach(([missFile, missList]) => {
      // Prettify miss sources.
      missed[missFile] = missList.map(
        ({ src, loc: { start: { line, column } } }) => `[${line}:${column}]: ${src}`
      );
    });
  });

  return results;
};

const highlight = (indent, color, prefix = "") => [
  new RegExp(`^([ ]{${indent}}[^ ]{1}.*):`, "gm"),
  (_, val) => chalk `${prefix}{${color} ${val}}:`
];
const highlightMiss = () => [
  /^( {8}- \")(\[[0-9]+:[0-9]+\])(: )(.*?)(\")$/gm,
  // eslint-disable-next-line max-params
  (_, v1, v2, v3, v4, v5) => chalk `${v1}{yellow ${v2}}${v3}{gray ${v4}}${v5}`
];

const bundleReport = ({ config, concurrency, dryRun, results }) => {
  /* eslint-disable no-magic-numbers */
  const configStr = yaml.stringify({
    concurrency,
    dryRun,
    config
  })
    .replace(...highlight(0, "green"))
    .replace(...highlight(2, "gray"));

  const reportStr = yaml.stringify(results)
    .replace(...highlight(0, "cyan", "\n"))
    .replace(...highlight(2, "green"))
    .replace(...highlight(4, "gray"))
    .replace(...highlightMiss());

  /* eslint-enable no-magic-numbers */
  return chalk `
{blue ## Configuration}

${configStr}
{blue ## Output}
${reportStr}`.trim();
};

// ----------------------------------------------------------------------------
// Helpers: Concurrency
// ----------------------------------------------------------------------------
const createRunner = ({ concurrency }) => {
  // Run serially in band.
  if (concurrency === 1) {
    return {
      isWorker: false,
      bundle,
      run: serial
    };
  }

  // Run concurrently.
  const worker = new Worker(require.resolve("../worker/bundle"), { numWorkers: concurrency });
  return {
    isWorker: true,
    bundle: worker.bundle,
    run: async (tasks) => {
      await Promise.all(tasks)
        .catch((err) => {
          worker.end();
          throw err;
        });
      worker.end();
    }
  };
};

// ----------------------------------------------------------------------------
// Action: Package
// ----------------------------------------------------------------------------
const createPackage = async ({ opts: { config, concurrency, report, dryRun } = {} } = {}) => {
  const plan = await parseConfig({ config, concurrency });
  concurrency = plan.concurrency;

  // Bundle tasks.
  // Pre-seed results to guarantee key order.
  const rawResults = Object.entries(plan.packages).reduce((memo, [key, pkg]) => {
    memo[key] = { plan: pkg };
    return memo;
  }, {});
  const runner = createRunner({ concurrency });
  await runner.run(Object.entries(plan.packages).map(async ([key, pkg]) => {
    const { cwd, output, trace, traceOptions, include } = pkg;
    debug(chalk `{gray [${runner.isWorker ? "w" : "s"}]} Start bundle for: {cyan ${key}}`);

    const bundleResults = await runner.bundle({
      cwd,
      output,
      trace,
      traceOptions,
      include,
      dryRun
    });

    const { workerId } = bundleResults.output;
    const mode = workerId ? chalk `{gray [w{green ${workerId}}]}` : chalk `{gray [s]}`;
    debug(chalk `${mode} Finished bundle for {cyan ${key}}`);

    // Update results.
    Object.assign(rawResults[key], bundleResults);
  }));

  // Create prettified copy of results for better console output.
  const results = prettyResults(rawResults);

  // Handle error/warn cases.
  logCollapsed({ results });
  logMisses({ results });

  if (report) {
    log(bundleReport({ config, concurrency, dryRun, results }));
  } else {
    const prefix = dryRun ? chalk `{gray [dry-run]} Would create` : "Created";
    log(chalk `${prefix} {green ${Object.keys(results).length}} packages:`);

    Object.entries(results).forEach(([key, { output: { relPath, files } }]) => {
      log(chalk `- {cyan ${key}}: ${relPath} ({green ${files.length}} {gray files})`);
    });
  }

  // Bail on unresolved dynamic misses.
  handleCollapsed({ packages: plan.packages, results });
  handleMisses({ packages: plan.packages, results });
};

module.exports = {
  "package": createPackage
};
