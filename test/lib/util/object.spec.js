"use strict";

const { smartMerge } = require("../../../lib/util/object");

describe("lib/util/object", () => {
  describe("#smartMerge", () => {
    it("handles base cases", async () => {
      expect(smartMerge()).to.eql({});
      expect(smartMerge({})).to.eql({});
      expect(smartMerge({}, {})).to.eql({});
    });

    it("handles various simple cases", () => {
      expect(smartMerge({ a: ["1"], b: ["2"] }, {})).to.eql({ a: ["1"], b: ["2"] });
      expect(smartMerge({ a: ["1"] }, { b: ["2"] })).to.eql({ a: ["1"], b: ["2"] });
    });

    it("handles various complex cases", () => {
      expect(smartMerge({ a: ["1"], b: ["2"] }, { b: ["1"], c: ["3"] }))
        .to.eql({ a: ["1"], b: ["1", "2"], c: ["3"] });
      expect(smartMerge({ a: ["2", "1"], b: ["3", "2"] }, { b: ["1", "3"], c: ["3"] }))
        .to.eql({ a: ["1", "2"], b: ["1", "2", "3"], c: ["3"] });
    });
  });
});
