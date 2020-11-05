"use strict";

const mock = require("mock-fs");
const sinon = require("sinon");

const { getArgs, _loader } = require("../../../bin/lib/args");

describe("bin/lib/args", () => {
  let sandbox;

  beforeEach(() => {
    mock({});
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    mock.restore();
  });

  describe("--config", () => {
    it("errors on missing config", async () => {
      await expect(getArgs([
        "--config",
        "missing-cfg.yml"
      ])).to.eventually.be.rejectedWith(
        "Failed to load --config file \"missing-cfg.yml\" with error: ENOENT"
      );
    });

    it("inflates a JS configuration file", async () => {
      // mock-fs can't handle the real `require` well, so just stub it.
      sandbox.stub(_loader, "require").returns({
        packages: {
          one: {
            trace: [
              "src/one.js"
            ]
          }
        }
      });

      const args = await getArgs([
        "--config",
        "trace-pkg.js"
      ]);

      expect(args).to.have.nested.property("opts.config").that.eql({
        packages: {
          one: {
            trace: [
              "src/one.js"
            ]
          }
        }
      });
    });

    it("inflates a JSON configuration file", async () => {
      mock({
        "trace-pkg.json": JSON.stringify({
          packages: {
            one: {
              trace: [
                "src/one.js"
              ]
            }
          }
        })
      });

      const args = await getArgs([
        "--config",
        "trace-pkg.json"
      ]);

      expect(args).to.have.nested.property("opts.config").that.eql({
        packages: {
          one: {
            trace: [
              "src/one.js"
            ]
          }
        }
      });
    });

    it("inflates a YAML configuration file", async () => {
      mock({
        "trace-pkg.yml": `
        packages:
          one:
            trace:
              - src/one.js
        `.replace(/^ {8}/gm, "")
      });

      const args = await getArgs([
        "--config",
        "trace-pkg.yml"
      ]);

      expect(args).to.have.nested.property("opts.config").that.eql({
        packages: {
          one: {
            trace: [
              "src/one.js"
            ]
          }
        }
      });
    });
  });
});
