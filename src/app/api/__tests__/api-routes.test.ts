import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Mock rate-limit — must be before route imports
// ============================================================
vi.mock("@/lib/rate-limit", () => ({
  sensitiveApiLimiter: { limit: vi.fn().mockResolvedValue({ success: true }) },
  apiLimiter: { limit: vi.fn().mockResolvedValue({ success: true }) },
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

// ============================================================
// Mock Supabase client
// ============================================================
const mockUser = { id: "user-1", user_metadata: {} };
const mockProfile = { role: "proprietaire" };

const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
const mockLimit = vi.fn().mockReturnThis();
const mockEqChain = vi.fn().mockReturnValue({
  single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
  limit: mockLimit,
});
const mockSelect = vi.fn().mockReturnValue({ eq: mockEqChain });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: mockUser } });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    auth: {
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({ data: { user: { id: "new-1" } }, error: null }),
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: "new-1" } }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: "vendeur" }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));

vi.mock("@/lib/email/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue({ success: true, resend_id: "re_123" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: mockUser } });
  mockEqChain.mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    limit: mockLimit,
  });
});

// ============================================================
// Helper
// ============================================================
function makeNextRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost"), init);
}

// ============================================================
// /api/search
// ============================================================
describe("GET /api/search", () => {
  it("retourne un tableau vide si query < 2 chars", async () => {
    const { GET } = await import("@/app/api/search/route");
    const req = makeNextRequest("GET", "http://localhost/api/search?q=a");
    const res = await GET(req);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("retourne un tableau vide si query manquante", async () => {
    const { GET } = await import("@/app/api/search/route");
    const req = makeNextRequest("GET", "http://localhost/api/search");
    const res = await GET(req);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("retourne 401 si non authentifié", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { GET } = await import("@/app/api/search/route");
    const req = makeNextRequest("GET", "http://localhost/api/search?q=test");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ============================================================
// /api/users/invite
// ============================================================
describe("POST /api/users/invite", () => {
  it("retourne 401 si non authentifié", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { POST } = await import("@/app/api/users/invite/route");
    const req = makeNextRequest("POST", "http://localhost/api/users/invite", {
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
      mode: "create",
      password: "123456",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retourne 403 si pas propriétaire", async () => {
    mockEqChain.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: { role: "vendeur" }, error: null }),
      limit: mockLimit,
    });
    const { POST } = await import("@/app/api/users/invite/route");
    const req = makeNextRequest("POST", "http://localhost/api/users/invite", {
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
      mode: "create",
      password: "123456",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("retourne 400 si champs manquants", async () => {
    const { POST } = await import("@/app/api/users/invite/route");
    const req = makeNextRequest("POST", "http://localhost/api/users/invite", {
      email: "",
      firstName: "",
      lastName: "",
      mode: "create",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retourne 400 si password < 6 chars en mode create", async () => {
    const { POST } = await import("@/app/api/users/invite/route");
    const req = makeNextRequest("POST", "http://localhost/api/users/invite", {
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
      mode: "create",
      password: "12345",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// /api/email/send
// ============================================================
describe("POST /api/email/send", () => {
  it("retourne 401 si non authentifié", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { POST } = await import("@/app/api/email/send/route");
    const req = makeNextRequest("POST", "http://localhost/api/email/send", {
      notification_type: "devis_envoye",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retourne 403 si pas propriétaire", async () => {
    mockEqChain.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: { role: "vendeur" }, error: null }),
      limit: mockLimit,
    });
    const { POST } = await import("@/app/api/email/send/route");
    const req = makeNextRequest("POST", "http://localhost/api/email/send", {
      notification_type: "devis_envoye",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("retourne 400 si notification_type invalide", async () => {
    const { POST } = await import("@/app/api/email/send/route");
    const req = makeNextRequest("POST", "http://localhost/api/email/send", {
      notification_type: "type_inexistant",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid notification_type");
  });

  it("retourne 400 si JSON invalide", async () => {
    const { POST } = await import("@/app/api/email/send/route");
    const req = new NextRequest(new URL("http://localhost/api/email/send"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// /api/users/[id]/toggle-active
// ============================================================
describe("PATCH /api/users/[id]/toggle-active", () => {
  it("retourne 401 si non authentifié", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { PATCH } = await import("@/app/api/users/[id]/toggle-active/route");
    const req = makeNextRequest("PATCH", "http://localhost/api/users/target-1/toggle-active", {
      status: "inactive",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) });
    expect(res.status).toBe(401);
  });

  it("retourne 400 si self-modification", async () => {
    const { PATCH } = await import("@/app/api/users/[id]/toggle-active/route");
    const req = makeNextRequest("PATCH", "http://localhost/api/users/user-1/toggle-active", {
      status: "inactive",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(400);
  });

  it("retourne 400 pour un statut invalide", async () => {
    const { PATCH } = await import("@/app/api/users/[id]/toggle-active/route");
    const req = makeNextRequest("PATCH", "http://localhost/api/users/target-1/toggle-active", {
      status: "banned",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// /api/users/[id]/delete
// ============================================================
describe("DELETE /api/users/[id]/delete", () => {
  it("retourne 401 si non authentifié", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { DELETE } = await import("@/app/api/users/[id]/delete/route");
    const req = makeNextRequest("DELETE", "http://localhost/api/users/target-1/delete");
    const res = await DELETE(req, { params: Promise.resolve({ id: "target-1" }) });
    expect(res.status).toBe(401);
  });

  it("retourne 400 si self-deletion", async () => {
    const { DELETE } = await import("@/app/api/users/[id]/delete/route");
    const req = makeNextRequest("DELETE", "http://localhost/api/users/user-1/delete");
    const res = await DELETE(req, { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(400);
  });
});
