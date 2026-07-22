import type { ChatMessage, ChatMessagePage } from "@/types";

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
      request<{ message: string }>(`/auth/verify-email?token=${token}`, { method: "POST" }),
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
    myInterests: () => request("/users/me/interests"),
    myRequests: () => request("/users/me/requests"),
    requestBalanceChange: (amount: number, currency: string, note?: string) =>
      request("/users/me/balance-request", { method: "POST", body: JSON.stringify({ amount, currency, note }) }),
  },
  admin: {
    testDataStatus: () => request<{ exists: boolean; users: number; projects: number }>("/admin/test-data/status"),
    seedTestData: () => request<{ status: string; users: number; projects: number }>("/admin/test-data/seed", { method: "POST" }),
    deleteTestData: () => request<{ status: string; users_deleted: number; projects_deleted: number }>("/admin/test-data", { method: "DELETE" }),
    tasks: () => request("/admin/tasks"),
    approveProject: (id: number) => request(`/admin/projects/${id}/approve`, { method: "POST" }),
    rejectProject: (id: number, reason?: string) =>
      request(`/admin/projects/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: reason }),
      }),
    approveInterest: (id: number) => request(`/admin/interests/${id}/approve`, { method: "POST" }),
    rejectInterest: (id: number) => request(`/admin/interests/${id}/reject`, { method: "POST" }),
    approveRequest: (id: number) => request(`/admin/requests/${id}/approve`, { method: "POST" }),
    rejectRequest: (id: number, note?: string) =>
      request(`/admin/requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ admin_note: note }),
      }),
    history: () => request("/admin/history"),
    reopenProject: (id: number) => request(`/admin/projects/${id}/reopen`, { method: "POST" }),
    reopenInterest: (id: number) => request(`/admin/interests/${id}/reopen`, { method: "POST" }),
    reopenRequest: (id: number) => request(`/admin/requests/${id}/reopen`, { method: "POST" }),
    notifications: (unreadOnly = false) =>
      request(`/admin/notifications${unreadOnly ? "?unread_only=true" : ""}`),
    markNotificationRead: (id: number) =>
      request(`/admin/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () => request("/admin/notifications/read-all", { method: "POST" }),
  },
  projects: {
    listPublic: () => request("/projects/public"),
    list: () => request("/projects/"),
    my: () => request("/projects/my"),
    myParticipations: () => request("/projects/my-participations"),
    create: (data: object) => request("/projects/", { method: "POST", body: JSON.stringify(data) }),
    get: (id: number) => request(`/projects/${id}`),
    update: (id: number, data: object) => request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) => request(`/projects/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    updateVisibility: (id: number, visibility: string) => request(`/projects/${id}/visibility`, { method: "PATCH", body: JSON.stringify({ visibility }) }),
    join: (projectId: number, amount: number) =>
      request(`/projects/${projectId}/join`, { method: "POST", body: JSON.stringify({ amount }) }),
    withdrawParticipation: (projectId: number) =>
      request(`/projects/${projectId}/participation`, { method: "DELETE" }),
    changeParticipation: (projectId: number, data: { amount?: number; message?: string }) =>
      request(`/projects/${projectId}/participation`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    changeRequest: (projectId: number, data: { field?: string; value?: string; changes?: { field: string; value: string | null }[] }) =>
      request(`/projects/${projectId}/change-request`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    participants: (projectId: number) => request(`/projects/${projectId}/participants`),
    removeParticipant: (projectId: number, interestId: number) =>
      request(`/projects/${projectId}/participants/${interestId}`, { method: "DELETE" }),
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
    phaseItems: {
      list: (projectId: number) => request(`/projects/${projectId}/phase-items`),
      create: (projectId: number, data: object) =>
        request(`/projects/${projectId}/phase-items`, { method: "POST", body: JSON.stringify(data) }),
      update: (projectId: number, itemId: number, data: object) =>
        request(`/projects/${projectId}/phase-items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (projectId: number, itemId: number) =>
        request(`/projects/${projectId}/phase-items/${itemId}`, { method: "DELETE" }),
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
    chat: {
      list: (projectId: number, params?: { before_id?: number; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.before_id != null) qs.set("before_id", String(params.before_id));
        if (params?.limit != null) qs.set("limit", String(params.limit));
        const q = qs.toString() ? `?${qs}` : "";
        return request<ChatMessagePage>(`/projects/${projectId}/chat${q}`);
      },
      send: (projectId: number, content: string) =>
        request<ChatMessage>(`/projects/${projectId}/chat`, {
          method: "POST",
          body: JSON.stringify({ content }),
        }),
    },
  },
};
