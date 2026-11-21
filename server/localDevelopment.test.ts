import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("local development without external services", () => {
  it("uses a browser-compatible cookie for local HTTP development", () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const hostname of ["localhost", "127.0.0.1", "::1", "[::1]"]) {
      const options = getSessionCookieOptions({ protocol: "http", hostname, headers: {} } as Request);
      expect(options).toMatchObject({ httpOnly: true, path: "/", sameSite: "lax", secure: false });
    }
  });

  it("retains secure cookies for HTTPS and does not enable the local policy in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getSessionCookieOptions({ protocol: "https", hostname: "localhost", headers: {} } as Request))
      .toMatchObject({ sameSite: "none", secure: true });
    expect(getSessionCookieOptions({ protocol: "http", hostname: "preview.example", headers: { "x-forwarded-proto": "https" } } as Request))
      .toMatchObject({ sameSite: "none", secure: true });
    vi.stubEnv("NODE_ENV", "production");
    expect(getSessionCookieOptions({ protocol: "http", hostname: "localhost", headers: {} } as Request))
      .toMatchObject({ sameSite: "none", secure: false });
  });

  it("starts without Stripe credentials and rejects an unconfigured webhook locally", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const { handleStripeWebhook } = await import("./_core/stripeWebhook");
    const status = vi.fn(); const json = vi.fn();
    const response = { status, json } as unknown as Response;
    status.mockReturnValue(response);
    await handleStripeWebhook({ headers: { "stripe-signature": "local-no-service-test" } } as Request, response);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: "Payment webhooks are not configured" });
  });
});
