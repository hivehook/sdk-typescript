import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  sign,
  verify,
  verifyWithRotation,
  HEADER_SIGNATURE,
  HEADER_TIMESTAMP,
  HEADER_MESSAGE_ID,
} from "../src/webhook/index.js";

describe("webhook", () => {
  const secret = "whsec_test123";
  const payload = '{"event":"test"}';

  it("exports header constants", () => {
    expect(HEADER_SIGNATURE).toBe("X-Hivehook-Signature");
    expect(HEADER_TIMESTAMP).toBe("X-Hivehook-Timestamp");
    expect(HEADER_MESSAGE_ID).toBe("X-Hivehook-Message-ID");
  });

  it("signs a payload", async () => {
    const ts = 1700000000;
    const sig = await sign(payload, secret, ts);
    expect(sig).toMatch(/^v1=[a-f0-9]{64}$/);
  });

  it("produces deterministic signatures", async () => {
    const ts = 1700000000;
    const sig1 = await sign(payload, secret, ts);
    const sig2 = await sign(payload, secret, ts);
    expect(sig1).toBe(sig2);
  });

  it("different secrets produce different signatures", async () => {
    const ts = 1700000000;
    const sig1 = await sign(payload, secret, ts);
    const sig2 = await sign(payload, "different-secret", ts);
    expect(sig1).not.toBe(sig2);
  });

  it("verifies a valid signature", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, secret, ts);
    const valid = await verify(payload, secret, sig, ts, 300);
    expect(valid).toBe(true);
  });

  it("rejects wrong secret", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, secret, ts);
    const valid = await verify(payload, "wrong-secret", sig, ts, 300);
    expect(valid).toBe(false);
  });

  it("rejects wrong signature", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const valid = await verify(payload, secret, "v1=bad", ts, 300);
    expect(valid).toBe(false);
  });

  it("rejects expired timestamp", async () => {
    const ts = Math.floor(Date.now() / 1000) - 600;
    const sig = await sign(payload, secret, ts);
    const valid = await verify(payload, secret, sig, ts, 300);
    expect(valid).toBe(false);
  });

  it("skips timestamp check when tolerance is 0", async () => {
    const ts = Math.floor(Date.now() / 1000) - 600;
    const sig = await sign(payload, secret, ts);
    const valid = await verify(payload, secret, sig, ts, 0);
    expect(valid).toBe(true);
  });

  it("verifies with primary key via rotation", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, "primary", ts);
    const valid = await verifyWithRotation(payload, "primary", "secondary", sig, ts, 300);
    expect(valid).toBe(true);
  });

  it("verifies with secondary key via rotation", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, "secondary", ts);
    const valid = await verifyWithRotation(payload, "primary", "secondary", sig, ts, 300);
    expect(valid).toBe(true);
  });

  it("rejects invalid signature with rotation", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const valid = await verifyWithRotation(payload, "primary", "secondary", "v1=bad", ts, 300);
    expect(valid).toBe(false);
  });

  it("ignores empty secondary in rotation", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await sign(payload, "secondary", ts);
    const valid = await verifyWithRotation(payload, "primary", undefined, sig, ts, 300);
    expect(valid).toBe(false);
  });

  it("signs binary Uint8Array payloads byte-exact (matches Node crypto)", async () => {
    const ts = 1700000000;
    // Bytes that are NOT valid UTF-8 (lone high bytes). Decoding-then-encoding
    // would replace these with U+FFFD and produce a different MAC.
    const payloadBytes = new Uint8Array([0xff, 0xfe, 0x00, 0x01, 0x80, 0x81]);

    const sig = await sign(payloadBytes, secret, ts);

    // Build the reference HMAC the server would compute: timestamp + "." + raw bytes.
    const hmac = createHmac("sha256", secret);
    hmac.update(`${ts}.`);
    hmac.update(Buffer.from(payloadBytes));
    const expected = `v1=${hmac.digest("hex")}`;

    expect(sig).toBe(expected);

    // Round-trip verify with the same byte payload.
    const ok = await verify(payloadBytes, secret, sig, ts, 0);
    expect(ok).toBe(true);
  });
});
