import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      googleLogin: vi.fn(),
    },
  },
}));

import { api } from "@/lib/api";

describe("Auth API", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("login returns a token", async () => {
    vi.mocked(api.auth.login).mockResolvedValue({ access_token: "token123", token_type: "bearer" });
    const result = await api.auth.login("test@example.com", "password");
    expect(result.access_token).toBe("token123");
  });

  it("register accepts all fields", async () => {
    vi.mocked(api.auth.register).mockResolvedValue({
      id: 1, email: "test@example.com", global_role: "USER", is_active: true,
      first_name: "Max", last_name: "Mustermann", full_name: "Max Mustermann",
      phone: null, country: "Deutschland", user_type: "INVESTOR", avatar_url: null,
    });
    await api.auth.register("test@example.com", "password", "Max", "Mustermann", "", "Deutschland", "INVESTOR");
    expect(api.auth.register).toHaveBeenCalled();
  });

  it("google login returns token", async () => {
    vi.mocked(api.auth.googleLogin).mockResolvedValue({ access_token: "google-token", token_type: "bearer" });
    const result = await api.auth.googleLogin("google-id-token");
    expect(result.access_token).toBe("google-token");
  });

  it("login throws on invalid credentials", async () => {
    vi.mocked(api.auth.login).mockRejectedValue(new Error("Invalid credentials"));
    await expect(api.auth.login("bad@example.com", "wrong")).rejects.toThrow("Invalid credentials");
  });
});
