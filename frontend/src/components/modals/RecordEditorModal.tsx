import type { FormEvent } from "react";
import type { RecordEditorState } from "../../types/app";

type RecordEditorModalProps = {
  recordEditor: RecordEditorState | null;
  setRecordEditor: (value: RecordEditorState | null) => void;
  recordActionLoading: boolean;
  handleSaveRecordEditor: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export default function RecordEditorModal({
  recordEditor,
  setRecordEditor,
  recordActionLoading,
  handleSaveRecordEditor,
}: RecordEditorModalProps) {
  return (
    <>
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
    </>
  );
}
