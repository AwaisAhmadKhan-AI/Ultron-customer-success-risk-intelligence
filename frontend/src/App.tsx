import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

const API_BASE_URL = (
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const TOKEN_KEY = "ultron_access_token";
const PAGE_SIZE = 10;

type View = "overview" | "accounts" | "tasks" | "ai";

function viewFromPath(pathname: string): View {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/accounts") return "accounts";
  if (path === "/tasks") return "tasks";
  if (path === "/documents-ai") return "ai";
  return "overview";
}

function pathForView(view: View): string {
  switch (view) {
    case "accounts":
      return "/accounts";
    case "tasks":
      return "/tasks";
    case "ai":
      return "/documents-ai";
    default:
      return "/";
  }
}
type RiskLevel = "low" | "medium" | "high" | "critical";

type UserResponse = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

type Account = {
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

type AccountListResponse = {
  items: Account[];
  total: number;
  page: number;
  page_size: number;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
};

type Interaction = {
  id: string;
  interaction_type: string;
  subject: string | null;
  summary: string;
  occurred_at: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
};

type RiskSignal = {
  id: string;
  signal_type: string;
  severity: RiskLevel;
  status: string;
  title: string;
  description: string;
};

type RecordEditorState =
  | { kind: "contact"; accountId: string; contact: Contact }
  | { kind: "interaction"; accountId: string; interaction: Interaction }
  | { kind: "task"; accountId: string; task: Task }
  | { kind: "risk-dismiss"; accountId: string; signal: RiskSignal };

type AccountEditorState =
  | { mode: "create" }
  | { mode: "edit"; account: Account };

type DocumentRecord = {
  id: string;
  title: string;
  original_filename: string;
  size_bytes: number;
  ingestion_status: string;
  ingestion_error_code: string | null;
  created_at: string;
};

type InsightSummary = {
  id: string;
  status: string;
  suggested_risk_level: RiskLevel | null;
  summary: string | null;
  confidence: string | null;
  created_at: string;
  completed_at: string | null;
  error_code: string | null;
};

type CitationReference = {
  source_type: string;
  source_id: string;
};

type Evidence = {
  id: string;
  source_type: "document_chunk" | "interaction";
  source_id: string;
  source_title: string;
  source_date: string;
  excerpt: string;
  claim_supported: string | null;
  citation_order: number;
};

type RiskFactor = {
  description: string;
  evidence?: CitationReference[];
};

type Recommendation = {
  action: string;
  rationale: string;
  evidence?: CitationReference[];
};

type AIInsight = {
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

type AccountOverview = {
  account: Account;
  contacts: Contact[];
  recent_interactions: Interaction[];
  open_tasks: Task[];
  risk_signals: RiskSignal[];
  documents: DocumentRecord[];
  recent_ai_insights: InsightSummary[];
};

type LoadedOverview = {
  accountId: string;
  data: AccountOverview;
};

type LoadedInsight = {
  accountId: string;
  data: AIInsight;
};

type RequestOptions = {
  token?: string | null;
  method?: string;
  json?: unknown;
  form?: URLSearchParams;
  multipart?: FormData;
  signal?: AbortSignal;
};

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers();

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let body: BodyInit | undefined;

  if (options.form) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    body = options.form;
  } else if (options.multipart) {
    body = options.multipart;
  } else if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    if (payload && typeof payload === "object" && "detail" in payload) {
      const detail = (payload as { detail: unknown }).detail;
      message =
        typeof detail === "string" ? detail : JSON.stringify(detail);
    } else if (response.statusText) {
      message = response.statusText;
    }

    throw new Error(message);
  }

  return payload as T;
}

function labelize(value: string | null | undefined): string {
  if (!value) return "Not available";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not set";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function daysUntil(value: string | null): number | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  const renewal = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  renewal.setHours(0, 0, 0, 0);

  return Math.ceil(
    (renewal.getTime() - today.getTime()) / 86_400_000,
  );
}

function riskClass(value: string | null | undefined): string {
  switch (value) {
    case "critical":
      return "bg-red-100 text-red-800 ring-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "medium":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "low":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function statusClass(value: string | null | undefined): string {
  switch (value) {
    case "active":
    case "completed":
    case "ready":
      return "bg-emerald-50 text-emerald-700";
    case "at_risk":
    case "renewal_pending":
    case "processing":
    case "in_progress":
      return "bg-amber-50 text-amber-800";
    case "churned":
    case "failed":
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
        <div>
          <h2 className="font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string | number;
  note: string;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    </article>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

const filterInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function AccountTable({
  accounts,
  selectedAccountId,
  loading,
  onSelect,
}: {
  accounts: Account[];
  selectedAccountId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading accounts from the backend...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="No matching accounts"
        description="Try changing the search terms or filters. Only accounts assigned to your user are returned."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3 font-semibold">Account</th>
            <th className="px-3 py-3 font-semibold">Risk</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Renewal</th>
            <th className="px-3 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const selected = selectedAccountId === account.id;

            return (
              <tr
                key={account.id}
                className={`border-b border-slate-100 last:border-0 ${
                  selected ? "bg-indigo-50/50" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-3 py-4">
                  <button
                    type="button"
                    onClick={() => onSelect(account.id)}
                    className="text-left"
                  >
                    <span className="block font-semibold text-slate-900 hover:text-indigo-700">
                      {account.name}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-slate-400">
                      {account.id}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-4">
                  <Badge className={riskClass(account.risk_level)}>
                    {labelize(account.risk_level)}
                  </Badge>
                </td>
                <td className="px-3 py-4">
                  <Badge className={statusClass(account.status)}>
                    {labelize(account.status)}
                  </Badge>
                </td>
                <td className="px-3 py-4 text-slate-600">
                  {formatDate(account.renewal_date)}
                </td>
                <td className="px-3 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(account.id)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                  >
                    Select
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SelectedAccountPanel({
  account,
  overview,
  loading,
  error,
  onOpenTasks,
  onOpenAI,
}: {
  account: Account | null;
  overview: AccountOverview | null;
  loading: boolean;
  error: string | null;
  onOpenTasks: () => void;
  onOpenAI: () => void;
}) {
  return (
    <Panel
      title="Selected account"
      subtitle="Account details and its authorized overview."
      action={
        account?.risk_level ? (
          <Badge className={riskClass(account.risk_level)}>
            {labelize(account.risk_level)} risk
          </Badge>
        ) : undefined
      }
    >
      {!account ? (
        <EmptyState
          title="No account selected"
          description="When an assigned account is available, its details will appear here."
        />
      ) : (
        <>
          <h3 className="break-words text-xl font-semibold tracking-tight text-slate-950">
            {account.name}
          </h3>
          <p className="mt-2 break-all font-mono text-[11px] text-slate-400">
            {account.id}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-2">
                <Badge className={statusClass(account.status)}>
                  {labelize(account.status)}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Renewal date</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatDate(account.renewal_date)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Contacts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {loading ? "—" : (overview?.contacts.length ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Risk signals</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {loading ? "—" : (overview?.risk_signals.length ?? 0)}
              </p>
            </div>
          </div>

          {loading && (
            <p className="mt-4 text-sm text-slate-500">
              Loading account details...
            </p>
          )}

          {error && (
            <div role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenTasks}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              Review tasks
            </button>
            <button
              type="button"
              onClick={onOpenAI}
              className="rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Open AI workspace
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}

function InsightResult({ insight }: { insight: AIInsight }) {
  return (
    <Panel
      title="Latest analysis result"
      subtitle="AI findings are advisory and do not modify the stored account risk level."
      action={
        <Badge className={statusClass(insight.status)}>
          {labelize(insight.status)}
        </Badge>
      }
    >
      {insight.error_code && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Analysis did not complete successfully. Error code:{" "}
          <strong>{insight.error_code}</strong>
        </div>
      )}

      {insight.summary && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {insight.summary}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col items-start gap-2">
        {insight.suggested_risk_level && (
          <Badge className={riskClass(insight.suggested_risk_level)}>
            Suggested risk: {labelize(insight.suggested_risk_level)}
          </Badge>
        )}
        {insight.confidence && (
          <Badge className="bg-slate-100 text-slate-700">
            Confidence: {labelize(insight.confidence)}
          </Badge>
        )}
      </div>

      {insight.risk_factors && insight.risk_factors.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Risk factors</h3>
          <div className="mt-3 space-y-3">
            {insight.risk_factors.map((factor, index) => (
              <article
                key={`${factor.description}-${index}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm leading-6 text-slate-700">
                  {factor.description}
                </p>
                {factor.evidence && (
                  <p className="mt-2 break-all text-xs text-slate-500">
                    References:{" "}
                    {factor.evidence
                      .map((reference) => reference.source_id)
                      .join(", ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {insight.recommended_actions &&
        insight.recommended_actions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Recommended actions
            </h3>
            <div className="mt-3 space-y-3">
              {insight.recommended_actions.map((recommendation, index) => (
                <article
                  key={`${recommendation.action}-${index}`}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-800">
                    {recommendation.action}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {recommendation.rationale}
                  </p>
                  {recommendation.evidence && (
                    <p className="mt-2 break-all text-xs text-slate-500">
                      References:{" "}
                      {recommendation.evidence
                        .map((reference) => reference.source_id)
                        .join(", ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">
          Verified source citations
        </h3>

        {insight.evidence.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            No verified citations were returned for this analysis.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {insight.evidence.map((evidence) => (
              <article
                key={evidence.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {evidence.source_title}
                  </p>
                  <Badge className="bg-white text-slate-600 ring-1 ring-slate-200">
                    {labelize(evidence.source_type)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(evidence.source_date)} · Citation{" "}
                  {evidence.citation_order}
                </p>
                <blockquote className="mt-3 border-l-2 border-indigo-300 pl-3 text-sm leading-6 text-slate-700">
                  {evidence.excerpt}
                </blockquote>
                {evidence.claim_supported && (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Supports: {evidence.claim_supported}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(() =>
    window.sessionStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(
    () => Boolean(window.sessionStorage.getItem(TOKEN_KEY)),
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<View>(() =>
    viewFromPath(window.location.pathname),
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [accountsLoading, setAccountsLoading] = useState(
    () => Boolean(window.sessionStorage.getItem(TOKEN_KEY)),
  );
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [renewalFilter, setRenewalFilter] = useState("");
  const [openTasksFilter, setOpenTasksFilter] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);
  const [page, setPage] = useState(1);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const selectedAccountIdRef = useRef<string | null>(selectedAccountId);

  const [overviewRecord, setOverviewRecord] =
    useState<LoadedOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentUploadFeedback, setDocumentUploadFeedback] = useState<{
    accountId: string;
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [recordActionLoading, setRecordActionLoading] = useState(false);
  const [recordActionFeedback, setRecordActionFeedback] = useState<{
    accountId: string;
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [recordEditor, setRecordEditor] = useState<RecordEditorState | null>(null);
  const [accountEditor, setAccountEditor] = useState<AccountEditorState | null>(null);
  const [accountEditorError, setAccountEditorError] = useState<string | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountDirectoryFeedback, setAccountDirectoryFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const [question, setQuestion] = useState(
    "Identify the main customer success risks, supporting evidence, and recommended next actions.",
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [latestInsightRecord, setLatestInsightRecord] =
    useState<LoadedInsight | null>(null);

  const overview =
    overviewRecord?.accountId === selectedAccountId
      ? overviewRecord.data
      : null;

  const latestInsight =
    latestInsightRecord?.accountId === selectedAccountId
      ? latestInsightRecord.data
      : null;

  useEffect(() => {
    const normalizeCurrentLocation = () => {
      const currentView = viewFromPath(window.location.pathname);
      const canonicalPath = pathForView(currentView);
      if (window.location.pathname !== canonicalPath) {
        window.history.replaceState({}, "", canonicalPath);
      }
    };
    const handlePopState = () => {
      setActiveView(viewFromPath(window.location.pathname));
    };

    normalizeCurrentLocation();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!recordActionFeedback) return;
    const feedbackAtStart = recordActionFeedback;
    const timer = window.setTimeout(() => {
      setRecordActionFeedback((current) =>
        current === feedbackAtStart ? null : current,
      );
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [recordActionFeedback]);

  useEffect(() => {
    if (!accountDirectoryFeedback) return;
    const feedbackAtStart = accountDirectoryFeedback;
    const timer = window.setTimeout(() => {
      setAccountDirectoryFeedback((current) =>
        current === feedbackAtStart ? null : current,
      );
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [accountDirectoryFeedback]);

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem(TOKEN_KEY);

    if (!storedToken) return;

    let cancelled = false;

    void apiRequest<UserResponse>("/auth/me", { token: storedToken })
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
          setToken(storedToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          window.sessionStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          setAccounts([]);
          setTotalAccounts(0);
          selectedAccountIdRef.current = null;
          setSelectedAccountId(null);
          setOverviewRecord(null);
          setLatestInsightRecord(null);
          setAccountsLoading(false);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const form = new URLSearchParams();
      form.set("username", email.trim());
      form.set("password", password);

      const loginResult = await apiRequest<{
        access_token: string;
        token_type: string;
      }>("/auth/login", {
        method: "POST",
        form,
      });

      const currentUser = await apiRequest<UserResponse>("/auth/me", {
        token: loginResult.access_token,
      });

      window.sessionStorage.setItem(TOKEN_KEY, loginResult.access_token);
      setAccountsLoading(true);
      setToken(loginResult.access_token);
      setUser(currentUser);
      setPassword("");
      setPage(1);
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Login failed. Check the API connection and credentials.",
      );
    } finally {
      setLoginLoading(false);
    }
  }

  function navigateToView(view: View, replace = false) {
    const nextPath = pathForView(view);
    if (window.location.pathname !== nextPath) {
      if (replace) {
        window.history.replaceState({}, "", nextPath);
      } else {
        window.history.pushState({}, "", nextPath);
      }
    }
    setActiveView(view);
  }

  function handleLogout() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAccounts([]);
    setTotalAccounts(0);
    selectedAccountIdRef.current = null;
    setSelectedAccountId(null);
    setOverviewRecord(null);
    setLatestInsightRecord(null);
    navigateToView("overview", true);
    setLoginError(null);
    setAccountsError(null);
    setOverviewError(null);
    setApiError(null);
    setAccountsLoading(false);
    setOverviewLoading(false);
    setAnalysisLoading(false);
  }

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    params.set("include_archived", String(includeArchived));

    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (riskFilter) params.set("risk_level", riskFilter);
    if (renewalFilter) params.set("renewal_within_days", renewalFilter);
    if (openTasksFilter) params.set("has_open_tasks", openTasksFilter);

    void apiRequest<AccountListResponse>(`/accounts?${params.toString()}`, {
      token,
      signal: controller.signal,
    })
      .then((result) => {
        setAccounts(result.items);
        setTotalAccounts(result.total);
        setAccountsError(null);
        setApiError(null);

        const currentAccountId = selectedAccountIdRef.current;
        const nextAccountId =
          currentAccountId &&
          result.items.some((account) => account.id === currentAccountId)
            ? currentAccountId
            : (result.items[0]?.id ?? null);

        if (nextAccountId !== currentAccountId) {
          setOverviewLoading(Boolean(nextAccountId));
          setOverviewError(null);
          setLatestInsightRecord(null);
        }

        selectedAccountIdRef.current = nextAccountId;
        setSelectedAccountId(nextAccountId);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAccountsError(
            error instanceof Error
              ? error.message
              : "Could not load accounts.",
          );
          setApiError("The account API request failed.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAccountsLoading(false);
      });

    return () => controller.abort();
  }, [
    token,
    page,
    search,
    statusFilter,
    riskFilter,
    renewalFilter,
    openTasksFilter,
    includeArchived,
    accountRefreshKey,
  ]);

  useEffect(() => {
    if (!token || !selectedAccountId) return;

    const controller = new AbortController();

    void apiRequest<AccountOverview>(
      `/accounts/${selectedAccountId}/overview`,
      { token, signal: controller.signal },
    )
      .then((result) => {
        setOverviewRecord({
          accountId: selectedAccountId,
          data: result,
        });
        setOverviewError(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOverviewError(
            error instanceof Error
              ? error.message
              : "Could not load the account overview.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOverviewLoading(false);
      });

    return () => controller.abort();
  }, [token, selectedAccountId]);

  const highRiskCount = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.risk_level === "high" ||
          account.risk_level === "critical",
      ).length,
    [accounts],
  );

  const upcomingRenewals = useMemo(
    () =>
      accounts.filter((account) => {
        const days = daysUntil(account.renewal_date);
        return days !== null && days >= 0 && days <= 30;
      }).length,
    [accounts],
  );

  const pageCount = Math.max(1, Math.ceil(totalAccounts / PAGE_SIZE));

  function startAccountsReload() {
    setAccountsLoading(true);
    setAccountsError(null);
    setApiError(null);
  }

  function changePage(nextPage: number) {
    startAccountsReload();
    setPage(nextPage);
  }

  function resetFilters() {
    startAccountsReload();
    setSearch("");
    setStatusFilter("");
    setRiskFilter("");
    setRenewalFilter("");
    setOpenTasksFilter("");
    setIncludeArchived(false);
    setPage(1);
  }

  function selectAccount(id: string) {
    if (id !== selectedAccountId) {
      setOverviewLoading(true);
      setOverviewError(null);
      setLatestInsightRecord(null);
      setDocumentFile(null);
      setDocumentTitle("");
      setDocumentUploadFeedback(null);
      setRecordActionFeedback(null);

      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = "";
      }
    }

    selectedAccountIdRef.current = id;
    setSelectedAccountId(id);
  }

  function formString(data: FormData, key: string): string {
    const value = data.get(key);
    return typeof value === "string" ? value.trim() : "";
  }

  async function mutateAccountRecord(
    accountId: string,
    requestPath: string,
    successMessage: string,
    method = "POST",
    json?: unknown,
  ): Promise<boolean> {
    if (!token) {
      setRecordActionFeedback({
        accountId,
        kind: "error",
        message: "Your session is unavailable. Sign in again.",
      });
      return false;
    }

    setRecordActionLoading(true);
    setRecordActionFeedback(null);

    try {
      await apiRequest<unknown>(requestPath, {
        method,
        token,
        json,
      });
    } catch (error) {
      setRecordActionFeedback({
        accountId,
        kind: "error",
        message:
          error instanceof Error ? error.message : "The operation failed.",
      });
      setRecordActionLoading(false);
      return false;
    }

    let finalMessage = successMessage;

    try {
      const refreshedOverview = await apiRequest<AccountOverview>(
        `/accounts/${accountId}/overview`,
        { token },
      );

      if (selectedAccountIdRef.current === accountId) {
        setOverviewRecord({
          accountId,
          data: refreshedOverview,
        });
      }
    } catch {
      finalMessage +=
        " The change was saved, but refreshing the overview failed.";
    }

    setRecordActionFeedback({
      accountId,
      kind: "success",
      message: finalMessage,
    });
    setRecordActionLoading(false);
    return true;
  }

  async function handleCreateContact(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!token || !selectedAccountId) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const accountId = selectedAccountId;

    const firstName = formString(data, "first_name");
    const lastName = formString(data, "last_name");

    if (!firstName || !lastName) return;

    const created = await mutateAccountRecord(
      accountId,
      `/accounts/${accountId}/contacts`,
      "Contact created successfully.",
      "POST",
      {
        first_name: firstName,
        last_name: lastName,
        email: formString(data, "email") || null,
        phone: formString(data, "phone") || null,
        job_title: formString(data, "job_title") || null,
      },
    );

    if (created) form.reset();
  }

  async function handleCreateInteraction(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!token || !selectedAccountId) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const accountId = selectedAccountId;
    const subject = formString(data, "subject");
    const summary = formString(data, "summary");
    const occurredAt = formString(data, "occurred_at");

    if (!summary || !occurredAt) return;

    const occurredDate = new Date(occurredAt);

    if (Number.isNaN(occurredDate.getTime())) {
      setRecordActionFeedback({
        accountId,
        kind: "error",
        message: "Please provide a valid interaction date and time.",
      });
      return;
    }

    const created = await mutateAccountRecord(
      accountId,
      `/accounts/${accountId}/interactions`,
      "Interaction recorded successfully.",
      "POST",
      {
        interaction_type: formString(data, "interaction_type"),
        subject: subject || null,
        summary,
        occurred_at: occurredDate.toISOString(),
      },
    );

    if (created) form.reset();
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedAccountId) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const accountId = selectedAccountId;
    const title = formString(data, "title");
    const description = formString(data, "description");
    const dueValue = formString(data, "due_at");

    if (!title) return;

    const dueDate = dueValue ? new Date(dueValue) : null;

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      setRecordActionFeedback({
        accountId,
        kind: "error",
        message: "Please provide a valid task due date.",
      });
      return;
    }

    const created = await mutateAccountRecord(
      accountId,
      `/accounts/${accountId}/tasks`,
      "Follow-up task created successfully.",
      "POST",
      {
        title,
        description: description || null,
        priority: formString(data, "priority") || "medium",
        due_at: dueDate ? dueDate.toISOString() : null,
      },
    );

    if (created) form.reset();
  }

  async function handleCreateRiskSignal(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!token || !selectedAccountId) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const accountId = selectedAccountId;
    const title = formString(data, "title");
    const description = formString(data, "description");

    if (!title || !description) return;

    const created = await mutateAccountRecord(
      accountId,
      `/accounts/${accountId}/risk-signals`,
      "Risk signal created successfully.",
      "POST",
      {
        signal_type: formString(data, "signal_type"),
        severity: formString(data, "severity"),
        title,
        description,
      },
    );

    if (created) form.reset();
  }

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !accountEditor) return;

    const data = new FormData(event.currentTarget);
    const name = formString(data, "name");
    if (!name) {
      setAccountEditorError("Account name cannot be blank.");
      return;
    }

    const payload = {
      name,
      status: formString(data, "status") || "active",
      risk_level: formString(data, "risk_level") || null,
      renewal_date: formString(data, "renewal_date") || null,
    };

    setAccountEditorError(null);
    setAccountSaving(true);
    try {
      if (accountEditor.mode === "create") {
        const created = await apiRequest<Account>("/accounts", {
          method: "POST",
          token,
          json: payload,
        });
        selectedAccountIdRef.current = created.id;
        setSelectedAccountId(created.id);
        setAccountDirectoryFeedback({
          kind: "success",
          message: `Account "${created.name}" created successfully.`,
        });
      } else {
        const updated = await apiRequest<Account>(
          `/accounts/${accountEditor.account.id}`,
          { method: "PATCH", token, json: payload },
        );
        selectedAccountIdRef.current = updated.id;
        setSelectedAccountId(updated.id);
        setAccountDirectoryFeedback({
          kind: "success",
          message: `Account "${updated.name}" updated successfully.`,
        });
      }

      setSearch("");
      setStatusFilter("");
      setRiskFilter("");
      setRenewalFilter("");
      setOpenTasksFilter("");
      setIncludeArchived(false);
      setPage(1);
      setAccountsError(null);
      setAccountEditor(null);
      setAccountRefreshKey((current) => current + 1);
    } catch (error) {
      setAccountEditorError(
        error instanceof Error ? error.message : "Could not save this account.",
      );
    } finally {
      setAccountSaving(false);
    }
  }

  async function toggleSelectedAccountArchive() {
    if (!token || !selectedAccount || accountSaving) return;

    const account = selectedAccount;
    const shouldArchive = !account.is_archived;
    setAccountSaving(true);
    setAccountDirectoryFeedback(null);
    try {
      await apiRequest<unknown>(
        `/accounts/${account.id}/${shouldArchive ? "archive" : "unarchive"}`,
        { method: "POST", token },
      );
      setAccountDirectoryFeedback({
        kind: "success",
        message: shouldArchive
          ? `Account "${account.name}" archived. It can be restored later.`
          : `Account "${account.name}" restored successfully.`,
      });
      setAccountRefreshKey((current) => current + 1);
    } catch (error) {
      setAccountDirectoryFeedback({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Could not update account status.",
      });
    } finally {
      setAccountSaving(false);
    }
  }

  function editContact(accountId: string, contact: Contact) {
    setRecordEditor({ kind: "contact", accountId, contact });
  }

  function editInteraction(accountId: string, interaction: Interaction) {
    setRecordEditor({ kind: "interaction", accountId, interaction });
  }

  function editTask(accountId: string, task: Task) {
    setRecordEditor({ kind: "task", accountId, task });
  }

  function dismissRiskSignal(accountId: string, signal: RiskSignal) {
    setRecordEditor({ kind: "risk-dismiss", accountId, signal });
  }

  async function handleSaveRecordEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recordEditor) return;

    const editor = recordEditor;
    const data = new FormData(event.currentTarget);
    const accountId = editor.accountId;
    let requestPath: string;
    let successMessage: string;
    let method = "PATCH";
    let payload: unknown;

    if (editor.kind === "contact") {
      const firstName = formString(data, "first_name");
      const lastName = formString(data, "last_name");
      if (!firstName || !lastName) {
        setRecordActionFeedback({
          accountId,
          kind: "error",
          message: "First name and last name cannot be blank.",
        });
        return;
      }
      requestPath = `/accounts/${accountId}/contacts/${editor.contact.id}`;
      successMessage = "Contact updated successfully.";
      payload = {
        first_name: firstName,
        last_name: lastName,
        email: formString(data, "email") || null,
        phone: formString(data, "phone") || null,
        job_title: formString(data, "job_title") || null,
      };
    } else if (editor.kind === "interaction") {
      const summary = formString(data, "summary");
      if (!summary) {
        setRecordActionFeedback({
          accountId,
          kind: "error",
          message: "Interaction summary cannot be blank.",
        });
        return;
      }
      requestPath = `/accounts/${accountId}/interactions/${editor.interaction.id}`;
      successMessage = "Interaction updated successfully.";
      payload = {
        subject: formString(data, "subject") || null,
        summary,
      };
    } else if (editor.kind === "task") {
      const title = formString(data, "title");
      if (!title) {
        setRecordActionFeedback({
          accountId,
          kind: "error",
          message: "Task title cannot be blank.",
        });
        return;
      }
      requestPath = `/accounts/${accountId}/tasks/${editor.task.id}`;
      successMessage = "Task updated successfully.";
      payload = {
        title,
        description: formString(data, "description") || null,
      };
    } else {
      const reason = formString(data, "reason");
      if (!reason) {
        setRecordActionFeedback({
          accountId,
          kind: "error",
          message: "A dismissal reason is required.",
        });
        return;
      }
      requestPath = `/accounts/${accountId}/risk-signals/${editor.signal.id}/dismiss`;
      successMessage = "Risk signal dismissed with a reason.";
      method = "POST";
      payload = { reason };
    }

    const saved = await mutateAccountRecord(
      accountId,
      requestPath,
      successMessage,
      method,
      payload,
    );
    if (saved) setRecordEditor(null);
  }

  async function handleDocumentUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accountId = selectedAccountId;
    const file = documentFile;

    if (!token || !accountId) return;

    setDocumentUploadFeedback(null);

    if (!file) {
      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message: "Select a document to upload.",
      });
      return;
    }

    const extension = file.name.toLowerCase().split(".").pop();

    if (!extension || !["pdf", "txt", "md"].includes(extension)) {
      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message: "Only PDF, TXT and Markdown files are supported.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message: "The maximum document size is 10 MB.",
      });
      return;
    }

    setDocumentUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (documentTitle.trim()) {
        formData.append("title", documentTitle.trim());
      }

      const uploaded = await apiRequest<DocumentRecord>(
        `/accounts/${accountId}/documents`,
        {
          method: "POST",
          token,
          multipart: formData,
        },
      );

      setDocumentUploadFeedback({
        accountId,
        kind: "success",
        message: `${uploaded.original_filename} uploaded. Ingestion status: ${labelize(uploaded.ingestion_status)}.`,
      });
      setDocumentFile(null);
      setDocumentTitle("");
      setLatestInsightRecord(null);
      setAnalysisError(null);

      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = "";
      }

      try {
        const refreshedOverview = await apiRequest<AccountOverview>(
          `/accounts/${accountId}/overview`,
          { token },
        );

        setOverviewRecord({
          accountId,
          data: refreshedOverview,
        });
      } catch {
        if (selectedAccountIdRef.current === accountId) {
          setOverviewError(
            "The document was uploaded, but the account overview could not refresh. Reload the account to see its latest status.",
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Document upload failed.";

      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message,
      });
    } finally {
      setDocumentUploading(false);
    }
  }

  async function handleAnalyzeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedAccountId) {
      setAnalysisError("Select an account before running AI analysis.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setLatestInsightRecord(null);

    const accountId = selectedAccountId;

    try {
      const result = await apiRequest<AIInsight>(
        `/accounts/${accountId}/ai-insights`,
        {
          method: "POST",
          token,
          json: { question },
        },
      );

      setLatestInsightRecord({
        accountId,
        data: result,
      });

      const refreshedOverview = await apiRequest<AccountOverview>(
        `/accounts/${accountId}/overview`,
        { token },
      );

      setOverviewRecord({
        accountId,
        data: refreshedOverview,
      });
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "AI analysis request failed.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  }

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">
            ULTRON Customer Intelligence
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Checking your authenticated session...
          </p>
        </div>
      </main>
    );
  }

  if (!token || !user) {
    return (
      <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative">
            <div className="text-2xl font-bold tracking-[0.2em]">ULTRON</div>
            <div className="mt-1 text-sm text-slate-400">
              Customer Success Intelligence
            </div>
          </div>

          <div className="relative max-w-xl pb-10">
            <Badge className="bg-indigo-400/15 text-indigo-200">
              Internal workspace
            </Badge>
            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight">
              Turn account signals into better customer decisions.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
              Review account risk, follow customer interactions, track open
              tasks, and request evidence-grounded AI analysis in one workspace.
            </p>
          </div>

          <p className="relative text-xs text-slate-500">
            Access is limited to your assigned customer accounts.
          </p>
        </section>

        <section className="flex items-center justify-center bg-slate-50 p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <p className="text-xl font-bold tracking-[0.2em] text-slate-950">
                ULTRON
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Customer Success Intelligence
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                Secure access
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Sign in
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Sign in with your assigned customer success account.
              </p>

              {loginError && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={filterInputClass}
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={filterInputClass}
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? "Signing in..." : "Sign in securely"}
                </button>
              </form>

              <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                The backend must be running and configured to allow this
                frontend origin. No demo credentials are embedded here.
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              ULTRON · Customer Success Risk Intelligence Platform
            </p>
          </div>
        </section>
      </main>
    );
  }

  const selectedAccount =
    overview?.account ??
    accounts.find((account) => account.id === selectedAccountId) ??
    null;

  const navigation: { id: View; label: string; hint: string }[] = [
    { id: "overview", label: "Overview", hint: "Risk snapshot" },
    { id: "accounts", label: "Accounts", hint: "Search and filter" },
    { id: "tasks", label: "Tasks", hint: "Open follow-ups" },
    { id: "ai", label: "Documents & AI", hint: "Evidence and analysis" },
  ];

  const viewTitles: Record<View, { title: string; subtitle: string }> = {
    overview: {
      title: "Account intelligence",
      subtitle: "Review account health and prioritize customer follow-up.",
    },
    accounts: {
      title: "Account directory",
      subtitle: "Search and filter accounts assigned to your user.",
    },
    tasks: {
      title: "Open tasks",
      subtitle: "Review outstanding follow-up work for the selected account.",
    },
    ai: {
      title: "Documents & AI insights",
      subtitle: "Review source records and request evidence-grounded analysis.",
    },
  };

  const title = viewTitles[activeView];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="flex w-full flex-col bg-slate-950 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="border-b border-slate-800 px-6 py-6">
          <p className="text-xl font-bold tracking-[0.18em]">ULTRON</p>
          <p className="mt-1 text-xs text-slate-400">
            Customer Intelligence
          </p>
        </div>

        <div className="px-4 pt-5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>
          <nav className="mt-3 grid grid-cols-2 gap-1 md:grid-cols-1">
            {navigation.map((item) => {
              const active = activeView === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToView(item.id)}
                  className={`rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {item.label}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] ${
                      active ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    {item.hint}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 px-4 md:mt-auto md:pb-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold">{user.full_name}</p>
            <p className="mt-1 break-all text-xs text-slate-400">
              {user.email}
            </p>
            <Badge className="mt-3 bg-slate-800 text-slate-300">
              {labelize(user.role)}
            </Badge>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            >
              Sign out
            </button>
          </div>
          <p className="px-1 pt-4 text-[10px] leading-5 text-slate-600">
            Account data is restricted by server-side assignment checks.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-9">
        <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Customer Success <span className="px-1">/</span>{" "}
              {title.title}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {title.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {title.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <label
                htmlFor="selected-account"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Selected account
              </label>
              <select
                id="selected-account"
                value={selectedAccountId ?? ""}
                onChange={(event) => selectAccount(event.target.value)}
                disabled={accounts.length === 0}
                className="max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 disabled:opacity-50 sm:min-w-64"
              >
                {accounts.length === 0 && <option value="">No accounts</option>}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {apiError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {apiError} Check that the backend is running at{" "}
            <code className="font-mono">{API_BASE_URL}</code>.
          </div>
        )}

        {recordActionFeedback &&
          recordActionFeedback.accountId === selectedAccountId && (
            <div
              role={recordActionFeedback.kind === "error" ? "alert" : "status"}
              className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                recordActionFeedback.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {recordActionFeedback.message}
            </div>
          )}

        {activeView === "overview" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                label="Matching accounts"
                value={totalAccounts}
                note="Accounts matching the current server-side filters."
                accent="bg-indigo-500"
              />
              <StatCard
                label="High / critical"
                value={highRiskCount}
                note="Risk levels on the currently loaded page."
                accent="bg-red-500"
              />
              <StatCard
                label="Renewals within 30 days"
                value={upcomingRenewals}
                note="Upcoming renewal dates on the loaded page."
                accent="bg-amber-500"
              />
              <StatCard
                label="Open tasks"
                value={overview?.open_tasks.length ?? "—"}
                note="Outstanding tasks on the selected account."
                accent="bg-sky-500"
              />
            </section>

            <section className="mt-7 grid gap-6 2xl:grid-cols-[1.3fr_0.7fr]">
              <Panel
                title="Accounts requiring attention"
                subtitle="Select an account to inspect its related records."
                action={
                  <button
                    type="button"
                    onClick={() => navigateToView("accounts")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                  >
                    All account filters
                  </button>
                }
              >
                <AccountTable
                  accounts={accounts}
                  selectedAccountId={selectedAccountId}
                  loading={accountsLoading}
                  onSelect={selectAccount}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>
                    Page {page} of {pageCount} · {totalAccounts} matching
                    accounts
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1 || accountsLoading}
                      onClick={() => changePage(page - 1)}
                      className="rounded-lg border border-slate-200 px-3 py-2 font-medium disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= pageCount || accountsLoading}
                      onClick={() => changePage(page + 1)}
                      className="rounded-lg border border-slate-200 px-3 py-2 font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </Panel>

              <SelectedAccountPanel
                account={selectedAccount}
                overview={overview}
                loading={overviewLoading}
                error={overviewError}
                onOpenTasks={() => navigateToView("tasks")}
                onOpenAI={() => navigateToView("ai")}
              />
            </section>
          </>
        )}

        {activeView === "accounts" && (
          <div className="space-y-6">
            <Panel
              title="Search and filters"
              subtitle="Filters are sent to the backend, which enforces account assignment scope."
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700"
                >
                  Clear filters
                </button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <FilterField label="Search accounts">
                  <input
                    value={search}
                    onChange={(event) => {
                      startAccountsReload();
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Account name..."
                    className={filterInputClass}
                  />
                </FilterField>

                <FilterField label="Account status">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      startAccountsReload();
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    className={filterInputClass}
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="at_risk">At risk</option>
                    <option value="renewal_pending">Renewal pending</option>
                    <option value="churned">Churned</option>
                  </select>
                </FilterField>

                <FilterField label="Risk level">
                  <select
                    value={riskFilter}
                    onChange={(event) => {
                      startAccountsReload();
                      setRiskFilter(event.target.value);
                      setPage(1);
                    }}
                    className={filterInputClass}
                  >
                    <option value="">All risk levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </FilterField>

                <FilterField label="Renewal within">
                  <select
                    value={renewalFilter}
                    onChange={(event) => {
                      startAccountsReload();
                      setRenewalFilter(event.target.value);
                      setPage(1);
                    }}
                    className={filterInputClass}
                  >
                    <option value="">Any date</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </FilterField>

                <FilterField label="Open tasks">
                  <select
                    value={openTasksFilter}
                    onChange={(event) => {
                      startAccountsReload();
                      setOpenTasksFilter(event.target.value);
                      setPage(1);
                    }}
                    className={filterInputClass}
                  >
                    <option value="">Any task state</option>
                    <option value="true">Has open tasks</option>
                    <option value="false">No open tasks</option>
                  </select>
                </FilterField>

                <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(event) => {
                      startAccountsReload();
                      setIncludeArchived(event.target.checked);
                      setPage(1);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">
                      Include archived
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Include archived account records
                    </span>
                  </span>
                </label>
              </div>
            </Panel>

            {accountsError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {accountsError}
              </div>
            )}

            {accountDirectoryFeedback && (
              <div
                role={accountDirectoryFeedback.kind === "error" ? "alert" : "status"}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  accountDirectoryFeedback.kind === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {accountDirectoryFeedback.message}
              </div>
            )}

            <Panel
              title="Account directory"
              subtitle={`${totalAccounts} result(s) match the current filters.`}
              action={
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountEditorError(null);
                      setAccountEditor({ mode: "create" });
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    disabled={!selectedAccount || accountSaving}
                    onClick={() => {
                      if (!selectedAccount) return;
                      setAccountEditorError(null);
                      setAccountEditor({ mode: "edit", account: selectedAccount });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  >
                    Edit selected
                  </button>
                  <button
                    type="button"
                    disabled={!selectedAccount || accountSaving}
                    onClick={() => void toggleSelectedAccountArchive()}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-40"
                  >
                    {selectedAccount?.is_archived ? "Unarchive selected" : "Archive selected"}
                  </button>
                </div>
              }
            >
              <AccountTable
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                loading={accountsLoading}
                onSelect={selectAccount}
              />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <span>
                  Page {page} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || accountsLoading}
                    onClick={() => changePage(page - 1)}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-medium disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= pageCount || accountsLoading}
                    onClick={() => changePage(page + 1)}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-medium disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </Panel>

            <SelectedAccountPanel
              account={selectedAccount}
              overview={overview}
              loading={overviewLoading}
              error={overviewError}
              onOpenTasks={() => navigateToView("tasks")}
              onOpenAI={() => navigateToView("ai")}
            />
          </div>
        )}

        {activeView === "tasks" && (
          <Panel
            title={selectedAccount?.name ?? "Select an account"}
            subtitle="Open and in-progress tasks returned by the authorized account overview endpoint."
            action={
              <Badge className="bg-sky-50 text-sky-700">
                {overview?.open_tasks.length ?? 0} open
              </Badge>
            }
          >
            <form
              onSubmit={handleCreateTask}
              className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                Create follow-up task
              </h3>
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Task title"
                aria-label="Task title"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                rows={2}
                placeholder="Description (optional)"
                aria-label="Task description"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="priority"
                  defaultValue="medium"
                  aria-label="Task priority"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <label className="text-xs text-slate-600">
                  Due date (optional)
                  <input
                    name="due_at"
                    type="datetime-local"
                    aria-label="Task due date"
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={recordActionLoading || !selectedAccountId}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {recordActionLoading ? "Saving..." : "Create task"}
              </button>
            </form>

            {overviewLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading account tasks...
              </p>
            ) : overviewError ? (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
              >
                {overviewError}
              </div>
            ) : !overview || overview.open_tasks.length === 0 ? (
              <EmptyState
                title="No open tasks for this account"
                description="Select another assigned account or create follow-up tasks through the backend API."
              />
            ) : (
              <div className="space-y-3">
                {overview.open_tasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <Badge className={statusClass(task.status)}>
                        {labelize(task.status)}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Priority: {labelize(task.priority)}</span>
                      <span>Due: {formatDate(task.due_at)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={recordActionLoading}
                        onClick={() => editTask(overview.account.id, task)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={recordActionLoading}
                        onClick={() =>
                          void mutateAccountRecord(
                            overview.account.id,
                            `/accounts/${overview.account.id}/tasks/${task.id}/complete`,
                            "Task marked complete.",
                          )
                        }
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        disabled={recordActionLoading}
                        onClick={() =>
                          void mutateAccountRecord(
                            overview.account.id,
                            `/accounts/${overview.account.id}/tasks/${task.id}/cancel`,
                            "Task cancelled.",
                          )
                        }
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
</article>
                ))}
              </div>
            )}
          </Panel>
        )}

        {activeView === "ai" && (
          <div className="grid items-start gap-6 2xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <Panel
                title="Documents"
                subtitle={
                  selectedAccount
                    ? `Documents for ${selectedAccount.name}`
                    : "Select an account to view its documents."
                }
              >
                <form
                  onSubmit={handleDocumentUpload}
                  className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Upload customer evidence
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      PDF, TXT or Markdown · Maximum 10 MB. Documents are
                      processed for evidence-grounded AI analysis.
                    </p>
                  </div>

                  <label className="block text-sm font-medium text-slate-700">
                    Document title (optional)
                    <input
                      type="text"
                      value={documentTitle}
                      maxLength={200}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      disabled={!selectedAccountId || documentUploading}
                      placeholder="e.g. Quarterly account update"
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Choose document
                    <input
                      ref={documentFileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                      onChange={(event) => {
                        setDocumentFile(
                          event.currentTarget.files?.[0] ?? null,
                        );
                        setDocumentUploadFeedback(null);
                      }}
                      disabled={!selectedAccountId || documentUploading}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 disabled:bg-slate-100"
                    />
                  </label>

                  {documentUploadFeedback?.accountId === selectedAccountId && (
                    <p
                      role={
                        documentUploadFeedback.kind === "error"
                          ? "alert"
                          : "status"
                      }
                      className={`text-sm leading-5 ${
                        documentUploadFeedback.kind === "error"
                          ? "text-red-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {documentUploadFeedback.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      !selectedAccountId || !documentFile || documentUploading
                    }
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  >
                    {documentUploading ? "Uploading and processing..." : "Upload document"}
                  </button>
                </form>

                {overviewLoading ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Loading documents...
                  </p>
                ) : !overview || overview.documents.length === 0 ? (
                  <EmptyState
                    title="No documents available"
                    description="Uploaded documents will appear here when available for the selected account."
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.documents.map((document) => (
                      <article
                        key={document.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-semibold text-slate-900">
                              {document.title}
                            </h3>
                            <p className="mt-1 break-all text-xs text-slate-500">
                              {document.original_filename}
                            </p>
                          </div>
                          <Badge className={statusClass(document.ingestion_status)}>
                            {labelize(document.ingestion_status)}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {(document.size_bytes / 1024).toFixed(1)} KB ·{" "}
                          {formatDate(document.created_at)}
                        </p>
                        {document.ingestion_error_code && (
                          <p className="mt-2 text-xs text-red-700">
                            Ingestion error: {document.ingestion_error_code}
                          </p>
                        )}

                        <button
                          type="button"
                          disabled={recordActionLoading}
                          onClick={() =>
                            void mutateAccountRecord(
                              overview.account.id,
                              `/accounts/${overview.account.id}/documents/${document.id}/archive`,
                              "Document archived.",
                            )
                          }
                          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          Archive document
                        </button>
</article>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title="Recent AI analyses"
                subtitle="Past analysis runs recorded for the selected account."
              >
                {!overview || overview.recent_ai_insights.length === 0 ? (
                  <EmptyState
                    title="No AI analysis history"
                    description="Start an analysis to create the first insight for this account."
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.recent_ai_insights.map((insight) => (
                      <article
                        key={insight.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge className={statusClass(insight.status)}>
                            {labelize(insight.status)}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {formatDate(insight.created_at)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          {insight.summary ??
                            insight.error_code ??
                            "No summary recorded."}
                        </p>
                        <div className="mt-3 flex flex-col items-start gap-2">
                          {insight.suggested_risk_level && (
                            <Badge className={riskClass(insight.suggested_risk_level)}>
                              Suggested risk:{" "}
                              {labelize(insight.suggested_risk_level)}
                            </Badge>
                          )}
                          {insight.confidence && (
                            <Badge className="bg-slate-100 text-slate-700">
                              Confidence: {labelize(insight.confidence)}
                            </Badge>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel
                title="Evidence-grounded AI analysis"
                subtitle="The backend retrieves account-scoped evidence, validates model output, and saves findings with source references."
              >
                {!selectedAccountId ? (
                  <EmptyState
                    title="No account selected"
                    description="Select an assigned account to request analysis."
                  />
                ) : (
                  <form onSubmit={handleAnalyzeAccount} className="space-y-4">
                    <div>
                      <label
                        htmlFor="analysis-question"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Analysis question
                      </label>
                      <textarea
                        id="analysis-question"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        minLength={5}
                        maxLength={2000}
                        required
                        rows={5}
                        className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Use specific questions. The backend should report
                        insufficient evidence if it cannot support an answer.
                      </p>
                    </div>

                    {analysisError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                      >
                        {analysisError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={analysisLoading || overviewLoading}
                      className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {analysisLoading
                        ? "Analyzing authorized evidence..."
                        : "Run AI analysis"}
                    </button>
                  </form>
                )}
              </Panel>

              {latestInsight && <InsightResult insight={latestInsight} />}

              {overview?.recent_interactions &&
                overview.recent_interactions.length > 0 && (
                  <Panel
                    title="Recent interaction evidence"
                    subtitle="Recent account interactions that may support the AI analysis."
                  >
                    <div className="space-y-3">
                      {overview.recent_interactions.map((interaction) => (
                        <article
                          key={interaction.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">
                              {interaction.subject ??
                                labelize(interaction.interaction_type)}
                            </p>
                            <span className="text-xs text-slate-500">
                              {formatDate(interaction.occurred_at)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {interaction.summary}
                          </p>
                        </article>
                      ))}
                    </div>
                  </Panel>
                )}
            </div>
          </div>
        )}

        {activeView === "overview" && overview && (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel
              title="Recent interactions"
              subtitle={`Latest recorded conversations for ${overview.account.name}.`}
              action={
                <button
                  type="button"
                  onClick={() => navigateToView("ai")}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  View AI workspace
                </button>
              }
            >
              <form
                onSubmit={handleCreateInteraction}
                className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Record interaction
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    name="interaction_type"
                    defaultValue="meeting"
                    aria-label="Interaction type"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                  </select>
                  <input
                    name="subject"
                    maxLength={200}
                    placeholder="Subject (optional)"
                    aria-label="Interaction subject"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <label className="text-xs text-slate-600 sm:col-span-2">
                    Date and time
                    <input
                      name="occurred_at"
                      type="datetime-local"
                      required
                      defaultValue={new Date().toISOString().slice(0, 16)}
                      aria-label="Interaction date and time"
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <textarea
                    name="summary"
                    required
                    minLength={1}
                    maxLength={10000}
                    rows={3}
                    placeholder="What was discussed?"
                    aria-label="Interaction summary"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recordActionLoading || !selectedAccountId}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {recordActionLoading ? "Saving..." : "Save interaction"}
                </button>
              </form>

              {overview.recent_interactions.length === 0 ? (
                <EmptyState
                  title="No interactions recorded"
                  description="Interactions will appear here once they have been recorded for this account."
                />
              ) : (
                <div className="space-y-4">
                  {overview.recent_interactions.slice(0, 4).map((interaction) => (
                    <article
                      key={interaction.id}
                      className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800">
                          {interaction.subject ??
                            labelize(interaction.interaction_type)}
                        </p>
                        <span className="text-xs text-slate-500">
                          {formatDate(interaction.occurred_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {interaction.summary}
                      </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={recordActionLoading}
                            onClick={() =>
                              editInteraction(overview.account.id, interaction)
                            }
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={recordActionLoading}
                            onClick={() =>
                              void mutateAccountRecord(
                                overview.account.id,
                                `/accounts/${overview.account.id}/interactions/${interaction.id}/archive`,
                                "Interaction archived.",
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                          >
                            Archive
                          </button>
                        </div>
</article>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Risk signals"
              subtitle="Server-recorded signals associated with the selected account."
            >
              <form
                onSubmit={handleCreateRiskSignal}
                className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Add risk signal
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    name="signal_type"
                    defaultValue="other"
                    aria-label="Risk signal type"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="renewal_risk">Renewal risk</option>
                    <option value="low_engagement">Low engagement</option>
                    <option value="support_escalation">Support escalation</option>
                    <option value="negative_feedback">Negative feedback</option>
                    <option value="other">Other</option>
                  </select>
                  <select
                    name="severity"
                    defaultValue="medium"
                    aria-label="Risk signal severity"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <input
                    name="title"
                    required
                    maxLength={200}
                    placeholder="Risk signal title"
                    aria-label="Risk signal title"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                  />
                  <textarea
                    name="description"
                    required
                    rows={3}
                    placeholder="Describe the observed risk"
                    aria-label="Risk signal description"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recordActionLoading || !selectedAccountId}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {recordActionLoading ? "Saving..." : "Add risk signal"}
                </button>
              </form>

              {overview.risk_signals.length === 0 ? (
                <EmptyState
                  title="No risk signals recorded"
                  description="Risk signals will appear here when available."
                />
              ) : (
                <div className="space-y-3">
                  {overview.risk_signals.slice(0, 5).map((signal) => (
                    <article
                      key={signal.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {signal.title}
                        </p>
                        <Badge className={riskClass(signal.severity)}>
                          {labelize(signal.severity)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {signal.description}
                      </p>
                      <div className="mt-3">
                        <Badge className={statusClass(signal.status)}>
                          {labelize(signal.status)}
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {signal.status !== "resolved" &&
                          signal.status !== "dismissed" && (
                            <>
                              {signal.status === "active" && (
                                <button
                                  type="button"
                                  disabled={recordActionLoading}
                                  onClick={() =>
                                    void mutateAccountRecord(
                                      overview.account.id,
                                      `/accounts/${overview.account.id}/risk-signals/${signal.id}/acknowledge`,
                                      "Risk signal acknowledged.",
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                                >
                                  Acknowledge
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={recordActionLoading}
                                onClick={() =>
                                  void mutateAccountRecord(
                                    overview.account.id,
                                    `/accounts/${overview.account.id}/risk-signals/${signal.id}/resolve`,
                                    "Risk signal resolved.",
                                  )
                                }
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                              >
                                Resolve
                              </button>
                              <button
                                type="button"
                                disabled={recordActionLoading}
                                onClick={() =>
                                  dismissRiskSignal(overview.account.id, signal)
                                }
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                      </div>
</article>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Contacts"
              subtitle="Contacts linked to the selected account."
            >
              <form
                onSubmit={handleCreateContact}
                className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Add contact
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="first_name"
                    required
                    maxLength={100}
                    placeholder="First name"
                    aria-label="Contact first name"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    name="last_name"
                    required
                    maxLength={100}
                    placeholder="Last name"
                    aria-label="Contact last name"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    name="email"
                    type="email"
                    maxLength={255}
                    placeholder="Email (optional)"
                    aria-label="Contact email"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    name="phone"
                    maxLength={50}
                    placeholder="Phone (optional)"
                    aria-label="Contact phone"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    name="job_title"
                    maxLength={150}
                    placeholder="Job title (optional)"
                    aria-label="Contact job title"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recordActionLoading || !selectedAccountId}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {recordActionLoading ? "Saving..." : "Add contact"}
                </button>
              </form>

              {overview.contacts.length === 0 ? (
                <EmptyState
                  title="No contacts available"
                  description="Contact records will appear here once available for this account."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {overview.contacts.map((contact) => (
                    <article
                      key={contact.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <p className="font-semibold text-slate-900">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {contact.job_title ?? "Contact"}
                      </p>
                      <p className="mt-3 break-all text-sm text-slate-600">
                        {contact.email ?? "No email"}
                      </p>
                      {contact.phone && (
                        <p className="mt-1 text-sm text-slate-500">
                          {contact.phone}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={recordActionLoading}
                          onClick={() => editContact(overview.account.id, contact)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={recordActionLoading}
                          onClick={() =>
                            void mutateAccountRecord(
                              overview.account.id,
                              `/accounts/${overview.account.id}/contacts/${contact.id}/archive`,
                              "Contact archived.",
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </div>
</article>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Open tasks"
              subtitle="Outstanding work for the selected account."
              action={
                <button
                  type="button"
                  onClick={() => navigateToView("tasks")}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  View tasks
                </button>
              }
            >
              {overview.open_tasks.length === 0 ? (
                <EmptyState
                  title="No open tasks"
                  description="There are currently no open or in-progress tasks on this account."
                />
              ) : (
                <div className="space-y-3">
                  {overview.open_tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Priority: {labelize(task.priority)} · Due:{" "}
                          {formatDate(task.due_at)}
                        </p>
                      </div>
                      <Badge className={statusClass(task.status)}>
                        {labelize(task.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {overviewError && activeView !== "overview" && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {overviewError}
          </div>
        )}

        {accountEditor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAccountEditor(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-editor-title"
              className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 id="account-editor-title" className="text-lg font-semibold text-slate-900">
                    {accountEditor.mode === "create" ? "Create account" : "Edit account"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Account records are archived rather than permanently deleted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountEditor(null)}
                  aria-label="Close account editor"
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Account name
                  <input
                    name="name"
                    required
                    maxLength={200}
                    defaultValue={accountEditor.mode === "edit" ? accountEditor.account.name : ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g. Northwind Trading"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Status
                    <select
                      name="status"
                      defaultValue={accountEditor.mode === "edit" ? accountEditor.account.status : "active"}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="at_risk">At risk</option>
                      <option value="renewal_pending">Renewal pending</option>
                      <option value="churned">Churned</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Risk level
                    <select
                      name="risk_level"
                      defaultValue={accountEditor.mode === "edit" ? accountEditor.account.risk_level ?? "" : ""}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Not set</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Renewal date
                  <input
                    type="date"
                    name="renewal_date"
                    defaultValue={accountEditor.mode === "edit" ? accountEditor.account.renewal_date ?? "" : ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                {accountEditorError && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                    {accountEditorError}
                  </p>
                )}
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={accountSaving}
                    onClick={() => setAccountEditor(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accountSaving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {accountSaving ? "Saving..." : accountEditor.mode === "create" ? "Create account" : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {recordEditor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setRecordEditor(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="record-editor-title"
              className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <h2 id="record-editor-title" className="text-lg font-semibold text-slate-900">
                  {recordEditor.kind === "contact"
                    ? "Edit contact"
                    : recordEditor.kind === "interaction"
                      ? "Edit interaction"
                      : recordEditor.kind === "task"
                        ? "Edit task"
                        : "Dismiss risk signal"}
                </h2>
                <button
                  type="button"
                  onClick={() => setRecordEditor(null)}
                  aria-label="Close record editor"
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveRecordEditor} className="space-y-4">
                {recordEditor.kind === "contact" && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        First name
                        <input name="first_name" required defaultValue={recordEditor.contact.first_name} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Last name
                        <input name="last_name" required defaultValue={recordEditor.contact.last_name} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                      Email
                      <input type="email" name="email" defaultValue={recordEditor.contact.email ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Phone
                        <input type="tel" name="phone" inputMode="tel" defaultValue={recordEditor.contact.phone ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Job title
                        <input name="job_title" defaultValue={recordEditor.contact.job_title ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </label>
                    </div>
                  </>
                )}
                {recordEditor.kind === "interaction" && (
                  <>
                    <label className="block text-sm font-medium text-slate-700">
                      Subject
                      <input name="subject" defaultValue={recordEditor.interaction.subject ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Summary
                      <textarea name="summary" required rows={5} defaultValue={recordEditor.interaction.summary} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                  </>
                )}
                {recordEditor.kind === "task" && (
                  <>
                    <label className="block text-sm font-medium text-slate-700">
                      Task title
                      <input name="title" required defaultValue={recordEditor.task.title} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Description
                      <textarea name="description" rows={4} defaultValue={recordEditor.task.description ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                  </>
                )}
                {recordEditor.kind === "risk-dismiss" && (
                  <label className="block text-sm font-medium text-slate-700">
                    Reason for dismissal
                    <textarea name="reason" required rows={4} autoFocus className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Explain why this signal should be dismissed." />
                  </label>
                )}
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={recordActionLoading}
                    onClick={() => setRecordEditor(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordActionLoading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {recordActionLoading ? "Saving..." : recordEditor.kind === "risk-dismiss" ? "Dismiss signal" : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <footer className="mt-8 border-t border-slate-200 py-5 text-xs leading-5 text-slate-400">
          ULTRON Customer Success Risk Intelligence Platform · Displayed records
          are fetched from the backend API. Authorization is enforced server-side.
        </footer>
      </main>
    </div>
  );
}

export default App;
