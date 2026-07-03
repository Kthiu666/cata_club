/**
 * Route Handler Tests — GET /api/payments
 *
 * Verifies the mock payments list route returns correct JSON and contract
 * shapes.  These tests call the handler directly (not via HTTP), matching
 * the project's "node" test environment.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "../route";
import { resetMockStore } from "@/services/mockStore";

function makeGetRequest(): Request {
  return new Request("http://localhost/api/payments", {
    headers: { "x-mock-role": "admin" },
  });
}

beforeEach(() => {
  resetMockStore();
});

describe("GET /api/payments", () => {
  it("returns status 200 with Content-Type application/json", async () => {
    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns an array of payment validation requests", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
  });

  it("returns the seeded payment set (8 records)", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(body).toHaveLength(8);
  });

  it("contains the expected seeded records identified by id", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    const sofia = body.find((p: any) => p.id === "pv-001");
    expect(sofia).toBeDefined();
    expect(sofia.studentName).toBe("Sofia Martinez");
    expect(sofia.validationStatus).toBe("pendiente");
  });

  it("contains payments in all three validation states", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    const statuses: string[] = body.map((p: any) => p.validationStatus);
    expect(statuses).toContain("pendiente");
    expect(statuses).toContain("validado");
    expect(statuses).toContain("rechazado");
  });

  it("every record has the required contract fields", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    for (const p of body) {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("studentName");
      expect(p).toHaveProperty("membershipPeriod");
      expect(p).toHaveProperty("expectedAmount");
      expect(p).toHaveProperty("paymentMethod");
      expect(p).toHaveProperty("validationStatus");
      expect(p).toHaveProperty("currentMembershipStatus");
      expect(p).toHaveProperty("proofFileName");
      expect(p).toHaveProperty("proofFileType");
    }
  });

  it("returns deterministic data after resetMockStore", async () => {
    // Mutate then reset
    const first = await GET(makeGetRequest());
    const firstBody = await first.json();

    // Double reset has no ill effect
    resetMockStore();
    const second = await GET(makeGetRequest());
    const secondBody = await second.json();

    expect(secondBody).toEqual(firstBody);
  });

  it("returns data unchanged after handler is called multiple times", async () => {
    const a = await GET(makeGetRequest());
    const aBody = await a.json();

    const b = await GET(makeGetRequest());
    const bBody = await b.json();

    expect(bBody).toEqual(aBody);
  });

  it("returns 403 without x-mock-role header", async () => {
    const request = new Request("http://localhost/api/payments");
    const response = await GET(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Solo administradores pueden ver pagos");
  });

  it("returns 403 with x-mock-role: responsable_pago", async () => {
    const request = new Request("http://localhost/api/payments", {
      headers: { "x-mock-role": "responsable_pago" },
    });
    const response = await GET(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Solo administradores pueden ver pagos");
  });
});
