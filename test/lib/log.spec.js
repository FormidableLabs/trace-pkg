"use strict";

/* eslint-disable no-console */

const {
  debuglog,
  error,
  log,
  warn,
  setLoggingOptions
} = require("../../lib/log");
const sinon = require("sinon");
const util = require("util");

describe("lib/log", () => {
  let sandbox;
  let logStub;
  let errorStub;
  let debugStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logStub = sandbox.stub(console, "log");
    errorStub = sandbox.stub(console, "error");

    // Internally have debuglog return our spy instead of a real logger.
    debugStub = sandbox.spy();
    sandbox.stub(util, "debuglog").returns(debugStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("default options should log", () => {
    beforeEach(() => {
      setLoggingOptions({ silent: false });
    });

    it("debug should call debuglog function", () => {
      const debug = debuglog("test");
      debug();
      expect(debugStub).to.be.called;
    });

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
    beforeEach(() => {
      setLoggingOptions({ silent: true });
    });

    it("debug shouldn't call debuglog function", () => {
      const debug = debuglog("test");
      debug();
      expect(debugStub).to.not.be.called;
    });

    it("log shouldn't call console.log", () => {
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
