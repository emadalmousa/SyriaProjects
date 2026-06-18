export type GlobalRole = "SUPERADMIN" | "ADMIN" | "USER";

export type ProjectRole =
  | "PROJECT_OWNER"
  | "PROJECT_ADMIN"
  | "PROJECT_MANAGER"
  | "PROJECT_INVESTOR";

export type ProjectStatus =
  | "IDEA"
  | "ACTIVE"
  | "APPROVED"
  | "CONTRACT"
  | "FUNDED"
  | "COMPLETED"
  | "CANCELLED"
  | "PAUSED"
  | "REJECTED";

export type ProjectVisibility = "PRIVATE" | "PUBLIC" | "ONLY_INVESTORS" | "ARCHIVED";
export type VerificationStatus = "NOT_CHECKED" | "IN_REVIEW" | "DOCUMENTS_MISSING" | "VERIFIED" | "REJECTED";
export type RiskLevel = "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";
export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "DELAYED" | "CANCELLED";
export type ProjectUpdateVisibility = "PRIVATE" | "PUBLIC" | "INVESTORS_ONLY";
export type InterestType = "INVESTMENT" | "SUPPORT" | "CONTACT";
export type InterestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type UserType = "PROJECT_SUBMITTER" | "INVESTOR" | "PARTNER" | "OTHER";

export type ProjectCategory =
  | "FOOD" | "AGRICULTURE" | "TRADE" | "HANDMADE" | "EDUCATION" | "HEALTH"
  | "TRANSPORT" | "TECHNOLOGY" | "REPAIR_SERVICE" | "SMALL_SHOP" | "RESTAURANT"
  | "CAFE" | "CLOTHING" | "CONSTRUCTION" | "SOLAR_ENERGY" | "WOMEN_BUSINESS"
  | "YOUTH_PROJECT" | "OTHER";

export interface User {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  user_type: UserType;
  avatar_url: string | null;
  global_role: GlobalRole;
  is_active: boolean;
  created_at: string | null;
}

export interface ProjectListItem {
  id: number;
  title: string;
  short_description: string | null;
  category: ProjectCategory;
  city: string;
  country: string | null;
  needed_capital: number;
  currency: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  main_image_url: string | null;
  funding_progress: number;
  participant_count: number;
  total_invested: number;
}

export interface Participant {
  interest_id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  amount: number | null;
  status: string;
  joined_at: string | null;
}

export interface Project extends ProjectListItem {
  created_by_user_id: number;
  creator_name?: string | null;
  created_at?: string | null;
  address_text?: string | null;
  description: string;
  district: string | null;
  total_budget: number;
  own_capital: number;
  project_goal: string | null;
  target_customers: string | null;
  business_model: string | null;
  expected_monthly_revenue: number | null;
  expected_monthly_profit: number | null;
  expected_duration_months: number | null;
  verification_status: VerificationStatus;
  risk_level: RiskLevel;
  video_url: string | null;
  start_date: string | null;
}

export interface ProjectBudgetItem {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  is_required: boolean;
  sort_order: number;
}

export interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  target_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
}

export interface ProjectPhaseItem {
  id: number;
  project_id: number;
  milestone_id: number;
  title: string;
  amount: number;
  sort_order: number;
}

export interface ProjectUpdate {
  id: number;
  project_id: number;
  created_by_user_id: number;
  title: string;
  content: string;
  visibility: ProjectUpdateVisibility;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  project_role: ProjectRole;
}

export interface ProjectInterest {
  id: number;
  project_id: number;
  user_id: number;
  interest_type: InterestType;
  message: string | null;
  status: InterestStatus;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface SystemNotification {
  id: number;
  type: string;
  message: string;
  actor_name?: string;
  project_id?: number;
  project_title?: string;
  interest_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface AdminTask {
  id: number;
  title: string;
  short_description?: string;
  category?: string;
  city?: string;
  created_at: string;
  creator?: string;
}

export interface PendingInterest {
  id: number;
  project_id: number;
  project_title: string;
  user_id: number;
  user_name: string;
  user_email: string;
  amount?: number;
  created_at: string;
}

export type RequestType =
  | "CHANGE_PARTICIPATION"
  | "WITHDRAW_PARTICIPATION"
  | "CHANGE_PROJECT_DATA"
  | "CHANGE_PROJECT_STATUS";

export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface AdminRequest {
  id: number;
  type: RequestType;
  status: RequestStatus;
  requester_name?: string;
  project_id?: number;
  project_title?: string;
  interest_id?: number;
  payload?: string;
  admin_note?: string;
  created_at: string;
}

export interface AdminTasks {
  idea_projects: AdminTask[];
  pending_interests: PendingInterest[];
  pending_requests: AdminRequest[];
}

export interface HistoryProject {
  id: number;
  title: string;
  short_description?: string;
  city?: string;
  status: string;
  creator?: string;
  created_at: string;
  decided_at: string;
}

export interface HistoryInterest {
  id: number;
  project_id: number;
  project_title?: string;
  user_name?: string;
  user_email?: string;
  amount?: number;
  status: string;
  created_at: string;
  decided_at: string;
}

export interface HistoryRequest {
  id: number;
  type: RequestType;
  status: RequestStatus;
  requester_name?: string;
  project_id?: number;
  project_title?: string;
  payload?: string;
  admin_note?: string;
  created_at: string;
  decided_at: string;
}

export interface AdminHistory {
  reviewed_projects: HistoryProject[];
  reviewed_interests: HistoryInterest[];
  reviewed_requests: HistoryRequest[];
}

export interface UserInterest {
  id: number;
  project_id: number;
  project_title: string;
  project_status?: string;
  amount?: number;
  status: InterestStatus;
  created_at: string;
}
