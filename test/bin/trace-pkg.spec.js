"use strict";

const mock = require("mock-fs");
const sinon = require("sinon");
const globby = require("globby");

const pkg = require("../../package.json");
const { NAME } = require("../../bin/lib/args");
const { cli } = require("../../bin/trace-pkg");

const { zipContents } = require("../util/file");

describe("bin/trace-pkg", () => {
  let sandbox;
  let logStub;

  beforeEach(() => {
    mock({});
    sandbox = sinon.createSandbox();
    logStub = sandbox.stub(console, "log");
  });

  afterEach(() => {
    sandbox.restore();
    mock.restore();
  });

  describe("help", () => {
    it("displays help", async () => {
      await cli({ args: ["--help"] });

      expect(logStub).to.have.been.calledWithMatch(`Usage: ${NAME} [options]`);
    });
  });

  describe("version", () => {
    it("displays version", async () => {
      await cli({ args: ["-v"] });

      expect(logStub).to.have.been.calledWithMatch(pkg.version);
    });
  });

  describe("package", () => {
    it("displays help when missing required options"); // TODO

    it("packages source files", async () => {
      mock({
        "trace-pkg.yml": `
          packages:
            one:
              cwd: functions/one
              output: ../../.build/one.zip
              trace:
                - index.js
            two:
              cwd: functions/two
              output: ../../.build/two.zip
              trace:
                - index.js
              include:
                - src/two.*
        `.trim(/ {10}/gm, ""),
        "package.json": JSON.stringify({}),
        functions: {
          one: {
            "index.js": "module.exports = require('./src/dep');",
            src: {
              "dep.js": "module.exports = require('./deeper/dep');",
              deeper: {
                "dep.js": `
                  require("local-nm-pkg");
                  require("root-nm-pkg");
                  module.exports = "deeper-dep";
                `
              }
            },
            "package.json": JSON.stringify({
              main: "index.js"
            }),
            node_modules: {
              "local-nm-pkg": {
                "package.json": JSON.stringify({
                  main: "index.js"
                }),
                "index.js": "module.exports = 'local-nm-pkg';"
              }
            }
          },
          two: {
            "index.js": "module.exports = require(\"local-nm-pkg-two\");",
            src: {
              "two.json": "{ \"msg\": \"two\" }",
              "two.css": "body.two { background-color: pink; }"
            },
            "package.json": {
              main: "./index.js"
            },
            node_modules: {
              "local-nm-pkg-two": {
                "package.json": JSON.stringify({
                  main: "index.js"
                }),
                "index.js": "module.exports = 'local-nm-pkg-two';"
              }
            }
          },
          node_modules: {
            "root-nm-pkg": {
              "package.json": JSON.stringify({
                main: "main.js"
              }),
              "main.js": "module.exports = 'root-nm-pkg';"
            }
          }
        }
      });

      await cli({ args: [
        "--config",
        "trace-pkg.yml"
      ] });

      expect(logStub).to.have.been.calledWithMatch("Created 2 packages:");

      expect(await globby(".build/*.zip")).to.eql([
        ".build/one.zip",
        ".build/two.zip"
      ]);
      expect(zipContents(".build/one.zip")).to.eql([
        // Note: `root-nm-pkg` appears out of sorted order because collapsed
        // from `../../node_modules/root-nm-pkg/index.js`.
        "node_modules/root-nm-pkg/main.js",
        "node_modules/root-nm-pkg/package.json",
        "index.js",
        "node_modules/local-nm-pkg/index.js",
        "node_modules/local-nm-pkg/package.json",
        "package.json",
        "src/deeper/dep.js",
        "src/dep.js"
      ]);
      expect(zipContents(".build/two.zip")).to.eql([
        "index.js",
        "node_modules/local-nm-pkg-two/index.js",
        "node_modules/local-nm-pkg-two/package.json",
        "src/two.css",
        "src/two.json"
      ]);
    });
  });
});
