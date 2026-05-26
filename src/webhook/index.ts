const HEADER_SIGNATURE = "X-Hivehook-Signature";
const HEADER_TIMESTAMP = "X-Hivehook-Timestamp";
const HEADER_MESSAGE_ID = "X-Hivehook-Message-ID";

function hexEncode(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sign(
  payload: Uint8Array | string,
  secret: string,
  timestamp: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prefix = encoder.encode(`${timestamp}.`);
  const payloadBytes =
    typeof payload === "string" ? encoder.encode(payload) : payload;
  const message = new Uint8Array(prefix.length + payloadBytes.length);
  message.set(prefix, 0);
  message.set(payloadBytes, prefix.length);
  const sig = await crypto.subtle.sign("HMAC", key, message);
  return `v1=${hexEncode(new Uint8Array(sig))}`;
}

async function verify(
  payload: Uint8Array | string,
  secret: string,
  signature: string,
  timestamp: number,
  toleranceSeconds: number = 300
): Promise<boolean> {
  if (toleranceSeconds > 0) {
    const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
    if (age > toleranceSeconds) return false;
  }
  const expected = await sign(payload, secret, timestamp);
  return timingSafeEqual(signature, expected);
}

async function verifyWithRotation(
  payload: Uint8Array | string,
  primary: string,
  secondary: string | undefined,
  signature: string,
  timestamp: number,
  toleranceSeconds?: number
): Promise<boolean> {
  if (await verify(payload, primary, signature, timestamp, toleranceSeconds)) return true;
  if (secondary) return verify(payload, secondary, signature, timestamp, toleranceSeconds);
  return false;
}

export {
  sign,
  verify,
  verifyWithRotation,
  HEADER_SIGNATURE,
  HEADER_TIMESTAMP,
  HEADER_MESSAGE_ID,
};
