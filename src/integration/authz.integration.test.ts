import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";
import { config } from "../config";

describe("API integration - authz boundaries", () => {
  it("rejects anonymous admin access", async () => {
    const res = await request(app).get("/api/admin/reports/summary");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Unauthorized" });
  });

  it("rejects anonymous payment-refunds access", async () => {
    const res = await request(app).get("/api/admin/payment-refunds/candidates");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Unauthorized" });
  });

  it("rejects anonymous split-candidates access", async () => {
    const listRes = await request(app).get("/api/admin/split-candidates");
    expect(listRes.status).toBe(401);
    expect(listRes.body).toEqual({ message: "Unauthorized" });

    const splitRes = await request(app)
      .post("/api/admin/split-candidates/some-payment-id/split")
      .send({ parts: [{ doorNo: "6", amount: 10 }, { doorNo: "7", amount: 10 }] });
    expect(splitRes.status).toBe(401);
    expect(splitRes.body).toEqual({ message: "Unauthorized" });
  });

  it("rejects malformed bearer token", async () => {
    const res = await request(app)
      .get("/api/admin/reports/summary")
      .set("Authorization", "Bearer malformed-token");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid token" });
  });

  it("forbids resident role on admin route", async () => {
    const residentToken = jwt.sign(
      {
        userId: "e2e-resident",
        role: "RESIDENT",
        apartmentId: "apt-1",
      },
      config.jwtSecret,
      { expiresIn: "15m" }
    );

    const res = await request(app)
      .get("/api/admin/reports/summary")
      .set("Authorization", `Bearer ${residentToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Forbidden" });
  });
});
