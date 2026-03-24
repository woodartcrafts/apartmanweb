import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app";

describe("API integration", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("POST /api/auth/login validates payload", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
      password: "123",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid request");
  });

  it("POST /api/auth/login rate limits repeated attempts", async () => {
    const statuses: number[] = [];

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post("/api/auth/login").send({
        email: "not-an-email",
        password: "12345678a",
      });
      statuses.push(res.status);
    }

    expect(statuses.includes(429)).toBe(true);
  });

  it("GET /health blocks disallowed CORS origin", async () => {
    const res = await request(app).get("/health").set("Origin", "https://evil.example");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Origin is not allowed" });
  });
});
