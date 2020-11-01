"use strict";

const sinon = require("sinon");

describe("bin/lib/args", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

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
