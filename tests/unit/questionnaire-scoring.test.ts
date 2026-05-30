import { describe, it, expect } from "vitest";
import { PANAS_SF, SUS, SIMS, NASA_TLX, GODSPEED } from "@/shared/config/questionnaires";

// Build a responses object that answers every "qN"/"gN"/slider field with `v`.
function answerAll(ids: string[], v: number): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, v]));
}
const fieldIds = (inst: { fields: { id: string; type: string }[] }) =>
  inst.fields.filter((f) => f.type !== "info").map((f) => f.id);

describe("questionnaire scoring", () => {
  it("PANAS-SF splits positive and negative affect (5 items each)", () => {
    const s = PANAS_SF.score!(answerAll(fieldIds(PANAS_SF), 3));
    expect(s.positiveAffect).toBe(15);
    expect(s.negativeAffect).toBe(15);
  });

  it("SUS scores 50 when every item is the neutral midpoint", () => {
    const s = SUS.score!(answerAll(fieldIds(SUS), 3));
    expect(s.total).toBe(50);
  });

  it("SUS reaches 100 for the best possible answers", () => {
    // odd items (idx 0,2,..) best = 5; even items best = 1
    const best: Record<string, number> = {};
    SUS.fields.forEach((f, i) => (best[f.id] = i % 2 === 0 ? 5 : 1));
    expect(SUS.score!(best).total).toBe(100);
  });

  it("SIMS averages its four 4-item subscales", () => {
    const s = SIMS.score!(answerAll(fieldIds(SIMS), 4));
    expect(s.intrinsic).toBe(4);
    expect(s.identified).toBe(4);
    expect(s.external).toBe(4);
    expect(s.amotivation).toBe(4);
  });

  it("NASA-TLX raw load is the mean of the 6 dimensions", () => {
    const s = NASA_TLX.score!(answerAll(fieldIds(NASA_TLX), 50));
    expect(s.rawTlx).toBe(50);
  });

  it("Godspeed reports subscale means", () => {
    const s = GODSPEED.score!(answerAll(fieldIds(GODSPEED), 5));
    expect(s.overall).toBe(5);
    expect(s.likeability).toBe(5);
  });
});
