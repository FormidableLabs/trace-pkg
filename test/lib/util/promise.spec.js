"use strict";

/* eslint-disable no-magic-numbers,promise/avoid-new */

const { serial } = require("../../../lib/util/promise");

const delayPromise = (delayMs, val) => new Promise((resolve) => {
  setTimeout(() => resolve(val), delayMs);
});

describe("lib/util/promise", () => {
  describe("#serial", () => {
    it("handles base cases", async () => {
      await expect(serial([])).to.eventually.eql([]);
      await expect(serial([
        Promise.resolve(1)
      ])).to.eventually.eql([1]);
      await expect(serial([
        new Promise((resolve) => resolve(2))
      ])).to.eventually.eql([2]);
    });

    it("handles various promises", async () => {
      await expect(serial([
        Promise.resolve(1),
        new Promise((resolve) => resolve(2)),
        Promise.resolve(3)
      ])).to.eventually.eql([1, 2, 3]);
    });

    it("handles delayed promises", async () => {
      await expect(serial([
        delayPromise(5, 1),
        delayPromise(10, 2),
        delayPromise(1, 3)
      ])).to.eventually.eql([1, 2, 3]);
    });
  });
});
