/**
 * Auth flow tests — register + verify + JWT-gated routes.
 *
 * These run against a real Express app (via supertest) with an
 * in-memory Mongo. We cover:
 *
 *   - Registration creates user + default workspace + owner membership
 *   - Duplicate email is rejected with 409
 *   - Sign-in with wrong password returns 401 and does not reveal
 *     whether the email exists (response shape identical either way)
 *   - Minted JWT (via jose with AUTH_SECRET) opens /api/me
 *   - alg:none token is rejected
 *   - Expired token is rejected
 */
import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { SignJWT } from "jose";
import { createApp } from "../src/app.js";
import { UserModel } from "../src/db/user.model.js";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "test-secret-at-least-sixteen-chars",
);

async function mintToken(
  sub: string,
  email: string,
  opts: { expSeconds?: number } = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(now)
    .setExpirationTime(now + (opts.expSeconds ?? 300))
    .sign(SECRET);
}

describe("auth + JWT middleware", () => {
  const app = createApp();

  beforeEach(async () => {
    // DB is wiped by the global afterEach; this is just a safety net.
    await UserModel.deleteMany({});
  });

  it("registers a user and seeds workspace + owner membership", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "alice@example.com",
        password: "correct-horse-battery-staple",
        name: "Alice",
      })
      .expect(201);

    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.defaultWorkspace.slug).toMatch(/^alice/);
  });

  it("rejects duplicate emails with 409", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "bob@example.com", password: "a-very-long-password" })
      .expect(201);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bob@example.com", password: "another-long-password" })
      .expect(409);
    expect(res.body.error.code).toBe("conflict");
  });

  it("sign-in with wrong password returns 401 without leaking existence", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "carol@example.com", password: "the-right-password-123" })
      .expect(201);

    const wrong = await request(app)
      .post("/api/auth/verify")
      .send({ email: "carol@example.com", password: "nope-nope-nope-nope" })
      .expect(401);
    const missing = await request(app)
      .post("/api/auth/verify")
      .send({ email: "nobody@example.com", password: "nope-nope-nope-nope" })
      .expect(401);

    // Both responses have the same error shape — no enumeration signal.
    expect(wrong.body).toEqual(missing.body);
  });

  it("accepts a valid JWT on /api/me and returns session context", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "dave@example.com", password: "long-enough-password" })
      .expect(201);

    const token = await mintToken(reg.body.user.id, reg.body.user.email);

    const res = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.user.email).toBe("dave@example.com");
    expect(Array.isArray(res.body.memberships)).toBe(true);
    expect(res.body.memberships[0].role).toBe("owner");
  });

  it("rejects alg:none tokens (downgrade attack guard)", async () => {
    // Manually craft an alg:none token. header.payload. (no signature)
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
      .toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: "507f1f77bcf86cd799439011",
        email: "evil@example.com",
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    ).toString("base64url");
    const token = `${header}.${payload}.`;

    await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("rejects expired tokens", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "erin@example.com", password: "long-enough-password" })
      .expect(201);

    const token = await mintToken(reg.body.user.id, reg.body.user.email, {
      expSeconds: -1,
    });

    await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("rejects requests with no token", async () => {
    await request(app).get("/api/me").expect(401);
  });
});
