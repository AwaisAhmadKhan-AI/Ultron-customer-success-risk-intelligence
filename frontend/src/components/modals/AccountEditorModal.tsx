import type { FormEvent } from "react";
import type { AccountEditorState } from "../../types/app";

type AccountEditorModalProps = {
  accountEditor: AccountEditorState | null;
  setAccountEditor: (value: AccountEditorState | null) => void;
  accountEditorError: string | null;
  accountSaving: boolean;
  handleSaveAccount: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export default function AccountEditorModal({
  accountEditor,
  setAccountEditor,
  accountEditorError,
  accountSaving,
  handleSaveAccount,
}: AccountEditorModalProps) {
  return (
    <>
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
    </>
  );
}
