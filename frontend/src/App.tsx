import type { AppPageContext, View } from "./types/app";
import { useUltronController } from "./hooks/useUltronController";
import LoadingScreen from "./components/auth/LoadingScreen";
import LoginPage from "./components/auth/LoginPage";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";

const NAVIGATION: { id: View; label: string; hint: string }[] = [
  { id: "overview", label: "Overview", hint: "Risk snapshot" },
  { id: "accounts", label: "Accounts", hint: "Search and filter" },
  { id: "tasks", label: "Tasks", hint: "Open follow-ups" },
  { id: "ai", label: "Documents & AI", hint: "Evidence and analysis" },
];

const VIEW_TITLES: Record<View, { title: string; subtitle: string }> = {
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

function App() {
  const controller = useUltronController();

  if (controller.authLoading) return <LoadingScreen />;

  if (!controller.token || !controller.user) {
    return (
      <LoginPage
        email={controller.email}
        password={controller.password}
        loginLoading={controller.loginLoading}
        loginError={controller.loginError}
        onEmailChange={controller.setEmail}
        onPasswordChange={controller.setPassword}
        onSubmit={controller.handleLogin}
      />
    );
  }

  const title = VIEW_TITLES[controller.activeView];
  const selectedAccount = controller.selectedAccount;

  const pageContext: AppPageContext = {
    activeView: controller.activeView,
    accounts: controller.accounts,
    totalAccounts: controller.totalAccounts,
    accountsLoading: controller.accountsLoading,
    accountsError: controller.accountsError,
    search: controller.search,
    setSearch: controller.setSearch,
    statusFilter: controller.statusFilter,
    setStatusFilter: controller.setStatusFilter,
    riskFilter: controller.riskFilter,
    setRiskFilter: controller.setRiskFilter,
    renewalFilter: controller.renewalFilter,
    setRenewalFilter: controller.setRenewalFilter,
    openTasksFilter: controller.openTasksFilter,
    setOpenTasksFilter: controller.setOpenTasksFilter,
    includeArchived: controller.includeArchived,
    setIncludeArchived: controller.setIncludeArchived,
    page: controller.page,
    setPage: controller.setPage,
    selectedAccountId: controller.selectedAccountId,
    overviewLoading: controller.overviewLoading,
    overviewError: controller.overviewError,
    overview: controller.overview,
    selectedAccount,
    navigateToView: controller.navigateToView,
    highRiskCount: controller.highRiskCount,
    upcomingRenewals: controller.upcomingRenewals,
    pageCount: controller.pageCount,
    changePage: controller.changePage,
    selectAccount: controller.selectAccount,
    resetFilters: controller.resetFilters,
    startAccountsReload: controller.startAccountsReload,
    setAccountEditor: controller.setAccountEditor,
    setAccountEditorError: controller.setAccountEditorError,
    accountSaving: controller.accountSaving,
    accountDirectoryFeedback: controller.accountDirectoryFeedback,
    setAccountDirectoryFeedback: controller.setAccountDirectoryFeedback,
    toggleSelectedAccountArchive: controller.toggleSelectedAccountArchive,
    recordActionLoading: controller.recordActionLoading,
    mutateAccountRecord: controller.mutateAccountRecord,
    handleCreateContact: controller.handleCreateContact,
    handleCreateInteraction: controller.handleCreateInteraction,
    handleCreateTask: controller.handleCreateTask,
    handleCreateRiskSignal: controller.handleCreateRiskSignal,
    editContact: controller.editContact,
    editInteraction: controller.editInteraction,
    editTask: controller.editTask,
    dismissRiskSignal: controller.dismissRiskSignal,
    documentFile: controller.documentFile,
    setDocumentFile: controller.setDocumentFile,
    documentTitle: controller.documentTitle,
    setDocumentTitle: controller.setDocumentTitle,
    documentUploading: controller.documentUploading,
    documentUploadFeedback: controller.documentUploadFeedback,
    setDocumentUploadFeedback: controller.setDocumentUploadFeedback,
    documentFileInputRef: controller.documentFileInputRef,
    question: controller.question,
    setQuestion: controller.setQuestion,
    analysisLoading: controller.analysisLoading,
    analysisError: controller.analysisError,
    latestInsight: controller.latestInsight,
    handleDocumentUpload: controller.handleDocumentUpload,
    handleAnalyzeAccount: controller.handleAnalyzeAccount,
  };

  return (
    <WorkspaceLayout
      controller={controller}
      user={controller.user}
      navigation={NAVIGATION}
      title={title}
      pageContext={pageContext}
    />
  );
}

export default App;
