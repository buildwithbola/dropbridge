import { normalizeCode, updateCrc32 } from "./utils";

// Standard FIPS 180-4 SHA-256 round constants so pairId derivation & key hashing
// behave identically across both HTTPS (crypto.subtle) and plain HTTP LAN tabs.
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256Bytes(input: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = input.length * 8;
  const paddedLen = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(input);
  padded[input.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, h[i], false);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

export function generatePairSecret(): string {
  return uint8ToBase64(randomBytes(32))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Derive a deterministic server mailbox ID from roomCode + pairSecret.
 * Never reveals the pairSecret itself to the server.
 */
export function derivePairId(roomCode: string, pairSecret: string): string {
  const material = new TextEncoder().encode(`dropbridge-pair-v1:${normalizeCode(roomCode)}:${pairSecret}`);
  return `pair_${bytesToHex(sha256Bytes(material)).slice(0, 24)}`;
}

function deriveKeyBytes(pairSecret: string): Uint8Array {
  return sha256Bytes(new TextEncoder().encode(`dropbridge-key-v1:${pairSecret}`));
}

function xorSha256Stream(plain: Uint8Array, keyBytes: Uint8Array, nonce: Uint8Array): Uint8Array {
  const out = new Uint8Array(plain.length);
  const blockInput = new Uint8Array(keyBytes.length + nonce.length + 4);
  blockInput.set(keyBytes, 0);
  blockInput.set(nonce, keyBytes.length);
  const view = new DataView(blockInput.buffer);

  let counter = 0;
  for (let offset = 0; offset < plain.length; offset += 32) {
    view.setUint32(keyBytes.length + nonce.length, counter++, false);
    const pad = sha256Bytes(blockInput);
    const limit = Math.min(32, plain.length - offset);
    for (let i = 0; i < limit; i++) {
      out[offset + i] = plain[offset + i] ^ pad[i];
    }
  }
  return out;
}

async function importAesKey(pairSecret: string): Promise<CryptoKey> {
  const raw = deriveKeyBytes(pairSecret);
  const rawCopy = new Uint8Array(raw.byteLength);
  rawCopy.set(raw);
  return globalThis.crypto.subtle.importKey("raw", rawCopy.buffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptBytes(plain: Uint8Array, pairSecret: string): Promise<Uint8Array> {
  const nonce = randomBytes(12);
  const hasSubtle = typeof globalThis.crypto?.subtle?.encrypt === "function";

  if (hasSubtle) {
    const key = await importAesKey(pairSecret);
    const plainCopy = new Uint8Array(plain.byteLength);
    plainCopy.set(plain);
    const ivCopy = new Uint8Array(nonce.byteLength);
    ivCopy.set(nonce);
    const encrypted = new Uint8Array(
      await globalThis.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivCopy.buffer },
        key,
        plainCopy.buffer
      )
    );
    const packet = new Uint8Array(1 + 12 + encrypted.byteLength);
    packet[0] = 0x01;
    packet.set(nonce, 1);
    packet.set(encrypted, 13);
    return packet;
  }

  // Fallback for plain HTTP LAN testing where window.crypto.subtle is unavailable
  const keyBytes = deriveKeyBytes(pairSecret);
  const body = xorSha256Stream(plain, keyBytes, nonce);
  const crc = updateCrc32(0, plain);
  const packet = new Uint8Array(1 + 12 + body.byteLength + 4);
  packet[0] = 0x02;
  packet.set(nonce, 1);
  packet.set(body, 13);
  new DataView(packet.buffer).setUint32(13 + body.byteLength, crc, false);
  return packet;
}

export async function decryptBytes(packet: Uint8Array, pairSecret: string): Promise<Uint8Array> {
  if (packet.byteLength < 14) {
    throw new Error("Encrypted payload truncated");
  }

  const version = packet[0];
  const nonce = packet.subarray(1, 13);

  if (version === 0x01) {
    if (typeof globalThis.crypto?.subtle?.decrypt !== "function") {
      throw new Error("Web Crypto AES-GCM requires HTTPS");
    }
    const key = await importAesKey(pairSecret);
    const ivCopy = new Uint8Array(12);
    ivCopy.set(nonce);
    const cipherSlice = packet.subarray(13);
    const cipherCopy = new Uint8Array(cipherSlice.byteLength);
    cipherCopy.set(cipherSlice);
    const plain = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivCopy.buffer },
      key,
      cipherCopy.buffer
    );
    return new Uint8Array(plain);
  }

  if (version === 0x02) {
    if (packet.byteLength < 17) throw new Error("Fallback packet truncated");
    const cipherBody = packet.subarray(13, packet.byteLength - 4);
    const expectedCrc = new DataView(packet.buffer, packet.byteOffset, packet.byteLength).getUint32(
      packet.byteLength - 4,
      false
    );
    const keyBytes = deriveKeyBytes(pairSecret);
    const plain = xorSha256Stream(cipherBody, keyBytes, nonce);
    if (updateCrc32(0, plain) !== expectedCrc) {
      throw new Error("Encrypted drop integrity check failed");
    }
    return plain;
  }

  throw new Error(`Unsupported encryption packet version: ${version}`);
}

export async function encryptJson(payload: unknown, pairSecret: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await encryptBytes(bytes, pairSecret);
  return uint8ToBase64(encrypted);
}

export async function decryptJson<T>(b64: string, pairSecret: string): Promise<T> {
  const packet = base64ToUint8(b64);
  const plain = await decryptBytes(packet, pairSecret);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
