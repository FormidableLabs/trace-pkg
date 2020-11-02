"use strict";

const mock = require("mock-fs");
const sinon = require("sinon");

const { getArgs } = require("../../../bin/lib/args");

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

    it("errors on invalid config"); // TODO

    it("inflates a JS configuration file"); // TODO
    it("inflates a JSON configuration file"); // TODO

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

    it("handles package zip file name without .zip suffix"); // TODO
    it("handles package zip file name with .zip suffix"); // TODO
  });

  it("TODO: IMPLEMENT SUITE for other options"); // TODO
});
