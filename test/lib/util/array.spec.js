"use strict";

const { uniq, smartConcat } = require("../../../lib/util/array");

describe("lib/util/array", () => {
  describe("#uniq", () => {
    it("handles base cases", async () => {
      expect([].filter(uniq)).to.eql([]);
      expect(["a"].filter(uniq)).to.eql(["a"]);
    });

    it("handles various complex sorted cases", () => {
      expect(["a", "b"].filter(uniq)).to.eql(["a", "b"]);
      expect(["a", "b", "b", "c"].filter(uniq)).to.eql(["a", "b", "c"]);
    });

    it("leaves unsorted duplicate values", () => {
      expect(["a", "b", "a", "c"].filter(uniq)).to.eql(["a", "b", "a", "c"]);
    });
  });

  describe("#smartConcat", () => {
    it("handles base cases", async () => {
      expect(smartConcat()).to.eql([]);
      expect(smartConcat([])).to.eql([]);
      expect(smartConcat([], [])).to.eql([]);
    });

    it("handles various simple cases", () => {
      expect(smartConcat(["a", "b"])).to.eql(["a", "b"]);
      expect(smartConcat(null, ["c"])).to.eql(["c"]);
      expect(smartConcat(["a", "c"], ["b"])).to.eql(["a", "b", "c"]);
    });

    it("handles various complex cases", () => {
      expect(smartConcat(["a", "c", "b"], ["b", "a"])).to.eql(["a", "b", "c"]);
      expect(smartConcat(["a", "c", "b", "a", "b", "c", "c"])).to.eql(["a", "b", "c"]);
    });
  });
});
