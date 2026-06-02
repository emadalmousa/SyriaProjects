const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (email: string, password: string, full_name?: string, last_name?: string, phone?: string, country?: string, user_type?: string) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, first_name: full_name, last_name, phone, country, user_type }) }),
    login: (email: string, password: string) =>
      request<{ access_token: string; token_type: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    googleLogin: (id_token: string) =>
      request<{ access_token: string; token_type: string }>("/auth/google", { method: "POST", body: JSON.stringify({ id_token }) }),
    verifyEmail: (token: string) =>
      request<{ message: string }>(`/auth/verify-email?token=${token}`),
    resendVerification: (email: string) =>
      request<{ message: string }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token: string, new_password: string, confirm_password: string) =>
      request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password, confirm_password }) }),
  },
  users: {
    me: () => request("/users/me"),
    list: () => request("/users/"),
    updateProfile: (data: { first_name?: string; last_name?: string; phone?: string; country?: string }) =>
      request("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
    updateRole: (userId: number, global_role: string) =>
      request(`/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ global_role }) }),
    toggleActive: (userId: number) =>
      request(`/users/${userId}/active`, { method: "PATCH" }),
  },
  admin: {
    testDataStatus: () => request<{ exists: boolean; users: number; projects: number }>("/admin/test-data/status"),
    seedTestData: () => request<{ status: string; users: number; projects: number }>("/admin/test-data/seed", { method: "POST" }),
    deleteTestData: () => request<{ status: string; users_deleted: number; projects_deleted: number }>("/admin/test-data", { method: "DELETE" }),
  },
  projects: {
    listPublic: () => request("/projects/public"),
    list: () => request("/projects/"),
    my: () => request("/projects/my"),
    create: (data: object) => request("/projects/", { method: "POST", body: JSON.stringify(data) }),
    get: (id: number) => request(`/projects/${id}`),
    update: (id: number, data: object) => request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) => request(`/projects/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    updateVisibility: (id: number, visibility: string) => request(`/projects/${id}/visibility`, { method: "PATCH", body: JSON.stringify({ visibility }) }),
    join: (projectId: number) =>
      request(`/projects/${projectId}/join`, { method: "POST" }),
    members: {
      list: (projectId: number) => request(`/projects/${projectId}/members`),
      add: (projectId: number, userId: number, project_role: string) =>
        request(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ user_id: userId, project_role }) }),
      remove: (projectId: number, userId: number) =>
        request(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
    },
    interests: {
      list: (projectId: number) => request(`/projects/${projectId}/interests`),
      create: (projectId: number, interest_type: string, message?: string) =>
        request(`/projects/${projectId}/interests`, { method: "POST", body: JSON.stringify({ interest_type, message }) }),
      updateStatus: (projectId: number, interestId: number, status: string) =>
        request(`/projects/${projectId}/interests/${interestId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    },
    budgetItems: {
      list: (projectId: number) => request(`/projects/${projectId}/budget-items`),
      create: (projectId: number, data: object) =>
        request(`/projects/${projectId}/budget-items`, { method: "POST", body: JSON.stringify(data) }),
      update: (projectId: number, itemId: number, data: object) =>
        request(`/projects/${projectId}/budget-items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (projectId: number, itemId: number) =>
        request(`/projects/${projectId}/budget-items/${itemId}`, { method: "DELETE" }),
    },
    milestones: {
      list: (projectId: number) => request(`/projects/${projectId}/milestones`),
      create: (projectId: number, data: object) =>
        request(`/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(data) }),
      update: (projectId: number, milestoneId: number, data: object) =>
        request(`/projects/${projectId}/milestones/${milestoneId}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (projectId: number, milestoneId: number) =>
        request(`/projects/${projectId}/milestones/${milestoneId}`, { method: "DELETE" }),
    },
    updates: {
      list: (projectId: number) => request(`/projects/${projectId}/updates`),
      create: (projectId: number, data: object) =>
        request(`/projects/${projectId}/updates`, { method: "POST", body: JSON.stringify(data) }),
      update: (projectId: number, updateId: number, data: object) =>
        request(`/projects/${projectId}/updates/${updateId}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (projectId: number, updateId: number) =>
        request(`/projects/${projectId}/updates/${updateId}`, { method: "DELETE" }),
    },
  },
};
