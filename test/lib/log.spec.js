"use strict";

/* eslint-disable no-console */

const { setLoggingOptions, error, log, warn } = require("../../lib/log");
const sinon = require("sinon");

describe("lib/log", () => {
  let sandbox;
  let logStub;
  let errorStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logStub = sandbox.stub(console, "log");
    errorStub = sandbox.stub(console, "error");
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("default options should log", () => {
    it("log should call console.log", () => {
      log();
      expect(logStub).to.be.called;
    });

    it("warn should call console.log", () => {
      warn();
      expect(logStub).to.be.called;
    });

    it("error should call console.error", () => {
      error();
      expect(errorStub).to.be.called;
    });
  });

  describe("silent mode shouldn't log", () => {
    it("log shouldn't call console.log", () => {
      setLoggingOptions({ silent: true });
      log();
      expect(logStub).to.not.be.called;
    });

    it("warn shouldn't call console.log", () => {
      warn();
      expect(logStub).to.not.be.called;
    });

    it("error shouldn't call console.error", () => {
      error();
      expect(logStub).to.not.be.called;
    });
  });
});
