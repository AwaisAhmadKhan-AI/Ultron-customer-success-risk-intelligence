import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Badge, filterInputClass } from "./components/shared";
import { daysUntil, labelize } from "./lib/presentation";
import OverviewPage from "./pages/OverviewPage";
import AccountsPage from "./pages/AccountsPage";
import TasksPage from "./pages/TasksPage";
import DocumentsAIPage from "./pages/DocumentsAIPage";
import type {
  Account,
  AccountListResponse,
  AccountOverview,
  AccountEditorState,
  AIInsight,
  Contact,
  DocumentRecord,
  Interaction,
  LoadedInsight,
  LoadedOverview,
  RecordEditorState,
  RiskSignal,
  Task,
  UserResponse,
  View,
  AppPageContext,
} from "./types/app";


const API_BASE_URL = (
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const TOKEN_KEY = "ultron_access_token";
const PAGE_SIZE = 10;

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

  const pageContext: AppPageContext = {
    activeView,
    accounts,
    totalAccounts,
    accountsLoading,
    accountsError,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    riskFilter,
    setRiskFilter,
    renewalFilter,
    setRenewalFilter,
    openTasksFilter,
    setOpenTasksFilter,
    includeArchived,
    setIncludeArchived,
    page,
    setPage,
    selectedAccountId,
    overviewLoading,
    overviewError,
    overview,
    selectedAccount,
    navigateToView,
    highRiskCount,
    upcomingRenewals,
    pageCount,
    changePage,
    selectAccount,
    resetFilters,
    startAccountsReload,
    setAccountEditor,
    setAccountEditorError,
    accountSaving,
    accountDirectoryFeedback,
    setAccountDirectoryFeedback,
    toggleSelectedAccountArchive,
    recordActionLoading,
    mutateAccountRecord,
    handleCreateContact,
    handleCreateInteraction,
    handleCreateTask,
    handleCreateRiskSignal,
    editContact,
    editInteraction,
    editTask,
    dismissRiskSignal,
    documentFile,
    setDocumentFile,
    documentTitle,
    setDocumentTitle,
    documentUploading,
    documentUploadFeedback,
    setDocumentUploadFeedback,
    documentFileInputRef,
    question,
    setQuestion,
    analysisLoading,
    analysisError,
    latestInsight,
    handleDocumentUpload,
    handleAnalyzeAccount,
  };

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

        <OverviewPage context={pageContext} />
        <AccountsPage context={pageContext} />
        <TasksPage context={pageContext} />
        <DocumentsAIPage context={pageContext} />

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
