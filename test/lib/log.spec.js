"use strict";

/* eslint-disable no-console */

const { setLoggingOptions, error, log, warn } = require("../../lib/log");
const chai = require("chai");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);

describe("lib/log", () => {
  beforeEach(() => {
    sinon.spy(console, "log");
    sinon.spy(console, "error");
  });

  afterEach(() => {
    console.log.restore();
    console.error.restore();
  });

  describe("default options should log", () => {
    it("log should call console.log", () => {
      log();
      expect(console.log).to.be.called;
    });
    it("warn should call console.log", () => {
      warn();
      expect(console.log).to.be.called;
    });
    it("error should call console.error", () => {
      error();
      expect(console.error).to.be.called;
    });
  });
  describe("silent mode shouldn't log", () => {
    it("log shouldn't call console.log", () => {
      setLoggingOptions({ silent: true });
      log();
      expect(console.log).to.not.be.called;
    });
    it("warn shouldn't call console.log", () => {
      warn();
      expect(console.log).to.not.be.called;
    });
    it("error shouldn't call console.error", () => {
      error();
      expect(console.error).to.not.be.called;
    });
  });
})
;
