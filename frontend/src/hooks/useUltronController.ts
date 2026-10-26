import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { daysUntil } from "../lib/presentation";
import { apiRequest, PAGE_SIZE, TOKEN_KEY } from "../lib/api";
import { createAccountActions } from "../features/accounts/accountActions";
import { createRecordActions } from "../features/records/recordActions";
import { createDocumentAIActions } from "../features/documents/documentAIActions";
import { pathForView, viewFromPath } from "../lib/navigation";
import type {
  Account,
  AccountListResponse,
  AccountOverview,
  AccountEditorState,
  LoadedInsight,
  LoadedOverview,
  RecordEditorState,
  UserResponse,
  View,
} from "../types/app";

/**
 * Central workspace controller. It owns API state and event handlers while
 * the page, layout and modal components stay presentational.
 */
export function useUltronController() {
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

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

  const [overviewRecord, setOverviewRecord] =
    useState<LoadedOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewErrorRecord, setOverviewErrorRecord] = useState<{
    accountId: string | null;
    message: string;
  } | null>(null);
  const overviewError =
    overviewErrorRecord?.accountId === selectedAccountId
      ? overviewErrorRecord.message
      : null;
  const setOverviewError = useCallback(
    (message: string | null) => {
      setOverviewErrorRecord(
        message === null ? null : { accountId: selectedAccountId, message },
      );
    },
    [selectedAccountId],
  );

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
          setOverviewRecord(null);
          setOverviewErrorRecord(null);
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
  }, [token, selectedAccountId, setOverviewError]);

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
      setOverviewRecord(null);
      setOverviewErrorRecord(null);
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

  const selectedAccount =
    overview?.account ??
    accounts.find((account) => account.id === selectedAccountId) ??
    null;

  const recordActions = createRecordActions({
    token,
    selectedAccountId,
    recordEditor,
    setRecordEditor,
    setRecordActionLoading,
    setRecordActionFeedback,
    setOverviewRecord,
  });

  const accountActions = createAccountActions({
    token,
    accountEditor,
    selectedAccount,
    accountSaving,
    setSelectedAccountId,
    setAccountDirectoryFeedback,
    setAccountEditorError,
    setAccountSaving,
    setSearch,
    setStatusFilter,
    setRiskFilter,
    setRenewalFilter,
    setOpenTasksFilter,
    setIncludeArchived,
    setPage,
    setAccountsError,
    setAccountEditor,
    setAccountRefreshKey,
  });

  const documentAIActions = createDocumentAIActions({
    token,
    selectedAccountId,
    documentFile,
    documentTitle,
    question,
    setDocumentUploadFeedback,
    setDocumentUploading,
    setDocumentFile,
    setDocumentTitle,
    setLatestInsightRecord,
    setAnalysisError,
    setOverviewRecord,
    setOverviewError,
    setAnalysisLoading,
  });

  return {
      authLoading,
      token,
      user,
      email,
      setEmail,
      password,
      setPassword,
      loginLoading,
      loginError,
      handleLogin,
      handleLogout,
      activeView,
      navigateToView,
      accounts,
      totalAccounts,
      accountsLoading,
      accountsError,
      apiError,
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
      selectedAccount,
      overviewLoading,
      overviewError,
      overview,
      highRiskCount,
      upcomingRenewals,
      pageCount,
      changePage,
      selectAccount,
      resetFilters,
      startAccountsReload,
      accountEditor,
      setAccountEditor,
      setAccountEditorError,
      accountEditorError,
      accountSaving,
      accountDirectoryFeedback,
      setAccountDirectoryFeedback,
      toggleSelectedAccountArchive: accountActions.toggleSelectedAccountArchive,
      recordEditor,
      setRecordEditor,
      recordActionLoading,
      recordActionFeedback,
      mutateAccountRecord: recordActions.mutateAccountRecord,
      handleCreateContact: recordActions.handleCreateContact,
      handleCreateInteraction: recordActions.handleCreateInteraction,
      handleCreateTask: recordActions.handleCreateTask,
      handleCreateRiskSignal: recordActions.handleCreateRiskSignal,
      editContact: recordActions.editContact,
      editInteraction: recordActions.editInteraction,
      editTask: recordActions.editTask,
      dismissRiskSignal: recordActions.dismissRiskSignal,
      documentFile,
      setDocumentFile,
      documentTitle,
      setDocumentTitle,
      documentUploading,
      documentUploadFeedback,
      setDocumentUploadFeedback,
      documentFileInputRef,
      handleDocumentUpload: documentAIActions.handleDocumentUpload,
      question,
      setQuestion,
      analysisLoading,
      analysisError,
      latestInsight,
      handleAnalyzeAccount: documentAIActions.handleAnalyzeAccount,
      handleSaveAccount: accountActions.handleSaveAccount,
      handleSaveRecordEditor: recordActions.handleSaveRecordEditor,
    };
}

export type UltronController = ReturnType<typeof useUltronController>;
