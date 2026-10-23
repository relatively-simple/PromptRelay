import test from "node:test";
import assert from "node:assert";

// Shared validation regex pattern used across client and database RPC
export const VALID_SHARE_PATTERN =
  /^https:\/\/(claude\.ai\/share\/|chatgpt\.com\/share\/|chat\.deepseek\.com\/share\/|gemini\.google\.com\/share\/|grok\.com\/share\/|x\.com\/i\/grok\/)[a-zA-Z0-9_\-]+/;

test("VALID_SHARE_PATTERN accepts valid frontier model share links", () => {
  const validUrls = [
    "https://claude.ai/share/7b8f9e01-1234-5678-90ab-cdef12345678",
    "https://chatgpt.com/share/67123abc-def4-5678-90ab-cdef12345678",
    "https://chat.deepseek.com/share/ds-9876543210-xyz",
    "https://gemini.google.com/share/gemini-token-12345",
    "https://grok.com/share/grok-run-abcde",
    "https://x.com/i/grok/share-link-123",
  ];

  for (const url of validUrls) {
    assert.strictEqual(
      VALID_SHARE_PATTERN.test(url),
      true,
      `Expected ${url} to be valid`
    );
  }
});

test("VALID_SHARE_PATTERN rejects malicious, spoofed, or unencrypted URLs", () => {
  const invalidUrls = [
    "http://claude.ai/share/unencrypted-http-link",
    "https://claude.ai.attacker.com/share/spoofed",
    "https://chatgpt.com.phishing.org/share/spoofed",
    "https://google.com/search?q=claude",
    "https://deepseek.com/other-page",
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "https://claude.ai/not-a-share/123",
    "",
  ];

  for (const url of invalidUrls) {
    assert.strictEqual(
      VALID_SHARE_PATTERN.test(url),
      false,
      `Expected ${url} to be invalid`
    );
  }
});
