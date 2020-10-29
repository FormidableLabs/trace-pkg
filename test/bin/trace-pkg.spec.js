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

    it("TODO: IMPLEMENT SUITE"); // TODO
  });
});
