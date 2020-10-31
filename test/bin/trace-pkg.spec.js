"use strict";

const sinon = require("sinon");

const pkg = require("../../package.json");
const { NAME, cli } = require("../../bin/trace-pkg");

describe("bin/trace-pkg", () => {
  let sandbox;
  let logStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logStub = sandbox.stub(console, "log");
  });

  afterEach(() => {
    sandbox.restore();
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

    describe("--config", () => {
      it("errors on missing config"); // TODO
      it("errors on invalid config"); // TODO
      it("inflates a JS configuration file"); // TODO
      it("inflates a JSON configuration file"); // TODO
      it("inflates a YAML configuration file"); // TODO

      it("handles package zip file name without .zip suffix"); // TODO
      it("handles package zip file name with .zip suffix"); // TODO
    });

    it("TODO: IMPLEMENT SUITE"); // TODO
  });
});
