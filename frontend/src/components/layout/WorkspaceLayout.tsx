import { Badge } from "../shared";
import { labelize } from "../../lib/presentation";
import { API_BASE_URL } from "../../lib/api";
import OverviewPage from "../../pages/OverviewPage";
import AccountsPage from "../../pages/AccountsPage";
import TasksPage from "../../pages/TasksPage";
import DocumentsAIPage from "../../pages/DocumentsAIPage";
import AccountEditorModal from "../modals/AccountEditorModal";
import RecordEditorModal from "../modals/RecordEditorModal";
import type { AppPageContext, UserResponse, View } from "../../types/app";
import type { UltronController } from "../../hooks/useUltronController";

type NavigationItem = { id: View; label: string; hint: string };
type PageTitle = { title: string; subtitle: string };

type WorkspaceLayoutProps = {
  controller: UltronController;
  user: UserResponse;
  navigation: NavigationItem[];
  title: PageTitle;
  pageContext: AppPageContext;
};

export default function WorkspaceLayout({
  controller,
  user,
  navigation,
  title,
  pageContext,
}: WorkspaceLayoutProps) {
  const {
    activeView,
    navigateToView,
    handleLogout,
    selectedAccountId,
    accounts,
    selectAccount,
    apiError,
    recordActionFeedback,
    overviewError,
  } = controller;

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

          <AccountEditorModal
            accountEditor={controller.accountEditor}
            setAccountEditor={controller.setAccountEditor}
            accountEditorError={controller.accountEditorError}
            accountSaving={controller.accountSaving}
            handleSaveAccount={controller.handleSaveAccount}
          />

          <RecordEditorModal
            recordEditor={controller.recordEditor}
            setRecordEditor={controller.setRecordEditor}
            recordActionLoading={controller.recordActionLoading}
            handleSaveRecordEditor={controller.handleSaveRecordEditor}
          />

          <footer className="mt-8 border-t border-slate-200 py-5 text-xs leading-5 text-slate-400">
            ULTRON Customer Success Risk Intelligence Platform · Displayed records
            are fetched from the backend API. Authorization is enforced server-side.
          </footer>
        </main>
      </div>
  );
}
