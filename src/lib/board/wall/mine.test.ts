import { describe, expect, it } from "vitest";
import { addMine, normaliseMine, parseMine, serializeMine } from "./mine";

describe("my tiles storage", () => {
  it("parses valid JSON into sorted unique indexes", () => {
    expect(parseMine("[5,1,5,399,0]")).toEqual([0, 1, 5, 399]);
  });
  it("ignores garbage without throwing", () => {
    expect(parseMine(null)).toEqual([]);
    expect(parseMine("")).toEqual([]);
    expect(parseMine("not json")).toEqual([]);
    expect(parseMine("{\"a\":1}")).toEqual([]);
    expect(parseMine("[1,\"2\",-1,400,2.5,null,7]")).toEqual([1, 7]);
  });
  it("adds new tiles without duplicates", () => {
    expect(addMine([3, 4], [4, 5, 6])).toEqual([3, 4, 5, 6]);
    expect(addMine([], [])).toEqual([]);
  });
  it("round-trips", () => {
    const s = serializeMine([9, 2, 2]);
    expect(s).toBe("[2,9]");
    expect(parseMine(s)).toEqual([2, 9]);
  });
  it("never holds more than the wall has", () => {
    expect(normaliseMine(Array.from({ length: 1000 }, (_, i) => i)).length).toBe(400);
  });
});
