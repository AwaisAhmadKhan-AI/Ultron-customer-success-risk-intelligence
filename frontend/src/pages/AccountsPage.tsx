import type { AppPageContext } from "../types/app";
import { Panel, AccountTable, SelectedAccountPanel, FilterField, filterInputClass } from "../components/shared";

export default function AccountsPage({ context }: { context: AppPageContext }) {
  const {
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
    setAccountEditor,
    setAccountEditorError,
    accountSaving,
    accountDirectoryFeedback,
    toggleSelectedAccountArchive,
    pageCount,
    startAccountsReload,
    changePage,
    resetFilters,
    selectAccount,
  } = context;

  return (
    <>
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

    </>
  );
}
