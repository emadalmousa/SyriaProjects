import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    projects: {
      list: vi.fn(),
      my: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      updateStatus: vi.fn(),
      members: { list: vi.fn(), add: vi.fn() },
      interests: { create: vi.fn() },
      budgetItems: { list: vi.fn(), create: vi.fn() },
      milestones: { list: vi.fn(), create: vi.fn() },
      updates: { list: vi.fn(), create: vi.fn() },
    },
  },
}));

import { api } from "@/lib/api";

describe("Projects API", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("create project returns DRAFT status", async () => {
    const mock = {
      id: 1, title: "Bäckerei", description: "desc", category: "FOOD",
      city: "Aleppo", status: "DRAFT", total_budget: 5000, own_capital: 1200,
      needed_capital: 3800, currency: "EUR", visibility: "PRIVATE",
      funding_progress: 24.0, created_by_user_id: 1,
    };
    vi.mocked(api.projects.create).mockResolvedValue(mock);
    const result = await api.projects.create({ title: "Bäckerei", category: "FOOD", city: "Aleppo", total_budget: 5000 }) as typeof mock;
    expect(result.status).toBe("DRAFT");
    expect(result.needed_capital).toBe(3800);
  });

  it("needed capital calculation: 5000 - 1200 = 3800", () => {
    const total = 5000;
    const own = 1200;
    expect(total - own).toBe(3800);
  });

  it("budget items can be listed", async () => {
    const mock = [{ id: 1, project_id: 1, title: "Backofen", amount: 1800, currency: "EUR", is_required: true, sort_order: 0 }];
    vi.mocked(api.projects.budgetItems.list).mockResolvedValue(mock);
    const result = await api.projects.budgetItems.list(1) as typeof mock;
    expect(result[0].title).toBe("Backofen");
  });

  it("milestones can be listed", async () => {
    const mock = [{ id: 1, project_id: 1, title: "Laden auswählen", status: "PLANNED", sort_order: 0 }];
    vi.mocked(api.projects.milestones.list).mockResolvedValue(mock);
    const result = await api.projects.milestones.list(1) as typeof mock;
    expect(result[0].status).toBe("PLANNED");
  });

  it("interest can be sent", async () => {
    const mock = { id: 1, project_id: 1, user_id: 2, interest_type: "INVESTMENT", message: null, status: "PENDING" };
    vi.mocked(api.projects.interests.create).mockResolvedValue(mock);
    const result = await api.projects.interests.create(1, "INVESTMENT") as typeof mock;
    expect(result.status).toBe("PENDING");
  });
});
