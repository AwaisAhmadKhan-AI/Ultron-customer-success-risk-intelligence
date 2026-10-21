import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";

export type View = "overview" | "accounts" | "tasks" | "ai";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type UserResponse = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type Account = {
  id: string;
  name: string;
  owner_user_id: string;
  status: string;
  risk_level: RiskLevel | null;
  renewal_date: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountListResponse = {
  items: Account[];
  total: number;
  page: number;
  page_size: number;
};

export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
};

export type Interaction = {
  id: string;
  interaction_type: string;
  subject: string | null;
  summary: string;
  occurred_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
};

export type RiskSignal = {
  id: string;
  signal_type: string;
  severity: RiskLevel;
  status: string;
  title: string;
  description: string;
};

export type RecordEditorState =
  | { kind: "contact"; accountId: string; contact: Contact }
  | { kind: "interaction"; accountId: string; interaction: Interaction }
  | { kind: "task"; accountId: string; task: Task }
  | { kind: "risk-dismiss"; accountId: string; signal: RiskSignal };

export type AccountEditorState =
  | { mode: "create" }
  | { mode: "edit"; account: Account };

export type DocumentRecord = {
  id: string;
  title: string;
  original_filename: string;
  size_bytes: number;
  ingestion_status: string;
  ingestion_error_code: string | null;
  created_at: string;
};

export type InsightSummary = {
  id: string;
  status: string;
  suggested_risk_level: RiskLevel | null;
  summary: string | null;
  confidence: string | null;
  created_at: string;
  completed_at: string | null;
  error_code: string | null;
};

export type CitationReference = {
  source_type: string;
  source_id: string;
};

export type Evidence = {
  id: string;
  source_type: "document_chunk" | "interaction";
  source_id: string;
  source_title: string;
  source_date: string;
  excerpt: string;
  claim_supported: string | null;
  citation_order: number;
};

export type RiskFactor = {
  description: string;
  evidence?: CitationReference[];
};

export type Recommendation = {
  action: string;
  rationale: string;
  evidence?: CitationReference[];
};

export type AIInsight = {
  id: string;
  account_id: string;
  status: string;
  suggested_risk_level: RiskLevel | null;
  summary: string | null;
  risk_factors: RiskFactor[] | null;
  recommended_actions: Recommendation[] | null;
  confidence: string | null;
  created_at: string;
  completed_at: string | null;
  error_code: string | null;
  evidence: Evidence[];
};

export type AccountOverview = {
  account: Account;
  contacts: Contact[];
  recent_interactions: Interaction[];
  open_tasks: Task[];
  risk_signals: RiskSignal[];
  documents: DocumentRecord[];
  recent_ai_insights: InsightSummary[];
};

export type LoadedOverview = {
  accountId: string;
  data: AccountOverview;
};

export type LoadedInsight = {
  accountId: string;
  data: AIInsight;
};

export type FeedbackKind = "success" | "error";

export type DirectoryFeedback = {
  kind: FeedbackKind;
  message: string;
};

export type AccountScopedFeedback = DirectoryFeedback & {
  accountId: string;
};

/** Props/context shared by the four page-level components. Business state and API
 * mutation handlers remain coordinated in App while page markup lives separately. */
export type AppPageContext = {
  activeView: View;
  accounts: Account[];
  totalAccounts: number;
  accountsLoading: boolean;
  accountsError: string | null;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  riskFilter: string;
  setRiskFilter: Dispatch<SetStateAction<string>>;
  renewalFilter: string;
  setRenewalFilter: Dispatch<SetStateAction<string>>;
  openTasksFilter: string;
  setOpenTasksFilter: Dispatch<SetStateAction<string>>;
  includeArchived: boolean;
  setIncludeArchived: Dispatch<SetStateAction<boolean>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  selectedAccountId: string | null;
  overviewLoading: boolean;
  overviewError: string | null;
  overview: AccountOverview | null;
  selectedAccount: Account | null;
  navigateToView: (view: View) => void;
  highRiskCount: number;
  upcomingRenewals: number;
  pageCount: number;
  changePage: (nextPage: number) => void;
  selectAccount: (id: string) => void;
  resetFilters: () => void;
  startAccountsReload: () => void;
  setAccountEditor: Dispatch<SetStateAction<AccountEditorState | null>>;
  setAccountEditorError: Dispatch<SetStateAction<string | null>>;
  accountSaving: boolean;
  accountDirectoryFeedback: DirectoryFeedback | null;
  setAccountDirectoryFeedback: Dispatch<SetStateAction<DirectoryFeedback | null>>;
  toggleSelectedAccountArchive: () => Promise<void>;
  recordActionLoading: boolean;
  mutateAccountRecord: (
    accountId: string,
    requestPath: string,
    successMessage: string,
    method?: string,
    json?: unknown,
  ) => Promise<boolean>;
  handleCreateContact: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleCreateInteraction: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleCreateTask: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleCreateRiskSignal: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  editContact: (accountId: string, contact: Contact) => void;
  editInteraction: (accountId: string, interaction: Interaction) => void;
  editTask: (accountId: string, task: Task) => void;
  dismissRiskSignal: (accountId: string, signal: RiskSignal) => void;
  documentFile: File | null;
  setDocumentFile: Dispatch<SetStateAction<File | null>>;
  documentTitle: string;
  setDocumentTitle: Dispatch<SetStateAction<string>>;
  documentUploading: boolean;
  documentUploadFeedback: AccountScopedFeedback | null;
  setDocumentUploadFeedback: Dispatch<SetStateAction<AccountScopedFeedback | null>>;
  documentFileInputRef: RefObject<HTMLInputElement | null>;
  question: string;
  setQuestion: Dispatch<SetStateAction<string>>;
  analysisLoading: boolean;
  analysisError: string | null;
  latestInsight: AIInsight | null;
  handleDocumentUpload: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleAnalyzeAccount: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};
