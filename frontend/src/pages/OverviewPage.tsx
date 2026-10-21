import type { AppPageContext } from "../types/app";
import { Badge, Panel, EmptyState, AccountTable, SelectedAccountPanel, StatCard } from "../components/shared";
import { formatDate, labelize, riskClass, statusClass } from "../lib/presentation";

export default function OverviewPage({ context }: { context: AppPageContext }) {
  const {
    activeView,
    accounts,
    totalAccounts,
    accountsLoading,
    page,
    pageCount,
    selectedAccountId,
    overviewLoading,
    overviewError,
    overview,
    highRiskCount,
    upcomingRenewals,
    changePage,
    navigateToView,
    selectAccount,
    selectedAccount,
    recordActionLoading,
    handleCreateInteraction,
    handleCreateContact,
    handleCreateRiskSignal,
    mutateAccountRecord,
    editContact,
    editInteraction,
    dismissRiskSignal,
  } = context;

  return (
    <>
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

    </>
  );
}
