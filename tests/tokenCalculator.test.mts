import test from "node:test";
import assert from "node:assert";
import {
  estimateTokensFromText,
  calculateTaskPricing,
  FORMAT_MULTIPLIERS,
} from "../lib/tokenCalculator.ts";

test("estimateTokensFromText handles empty strings and edge cases", () => {
  assert.strictEqual(estimateTokensFromText(""), 0);
  assert.strictEqual(estimateTokensFromText("   "), 0);
  assert.strictEqual(estimateTokensFromText("a"), 1);
  assert.strictEqual(estimateTokensFromText("1234"), 1);
  assert.strictEqual(estimateTokensFromText("12345"), 2);
});

test("FORMAT_MULTIPLIERS has exact required multipliers", () => {
  assert.strictEqual(FORMAT_MULTIPLIERS["Markdown / Text"], 1.0);
  assert.strictEqual(FORMAT_MULTIPLIERS["Code / Zip"], 1.3);
  assert.strictEqual(FORMAT_MULTIPLIERS["PDF Document"], 1.4);
  assert.strictEqual(FORMAT_MULTIPLIERS["PowerPoint / Slides"], 1.5);
});

test("calculateTaskPricing respects minimum floor and clamps negative tips", async () => {
  // Empty prompt, zero files
  const baseResult = await calculateTaskPricing("", [], "Markdown / Text", 0);
  assert.strictEqual(baseResult.recommendedCredits, 20);
  assert.strictEqual(baseResult.totalTokens, 0);

  // Negative tip must NOT decrease credits below recommended
  const negTipResult = await calculateTaskPricing("Sample prompt", [], "Markdown / Text", -50);
  assert.strictEqual(negTipResult.recommendedCredits >= 20, true);
  // Verify negative tip does not reduce rawRecommended
  const zeroTipResult = await calculateTaskPricing("Sample prompt", [], "Markdown / Text", 0);
  assert.strictEqual(negTipResult.recommendedCredits, zeroTipResult.recommendedCredits);
});
