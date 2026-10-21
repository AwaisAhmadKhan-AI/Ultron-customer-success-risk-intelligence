import type { AppPageContext } from "../types/app";
import { Badge, Panel, EmptyState } from "../components/shared";
import { formatDate, labelize, statusClass } from "../lib/presentation";

export default function TasksPage({ context }: { context: AppPageContext }) {
  const {
    activeView,
    selectedAccount,
    overview,
    overviewLoading,
    overviewError,
    recordActionLoading,
    mutateAccountRecord,
    handleCreateTask,
    editTask,
    selectedAccountId,
  } = context;

  return (
    <>
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

    </>
  );
}
