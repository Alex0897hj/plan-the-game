import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function encode(obj: object): string {
  return b64url(Buffer.from(JSON.stringify(obj)));
}

function sign(data: string): string {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

export function signJWT(payload: Record<string, unknown>, expiresInSeconds: number): string {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  const sig = sign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export function verifyJWT<T extends Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const expected = sign(`${header}.${body}`);

    if (!timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(expected, "base64"))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
