import type { Dispatch, FormEvent, SetStateAction } from "react";
import { apiRequest } from "../../lib/api";
import type {
  AccountOverview,
  Contact,
  Interaction,
  LoadedOverview,
  RecordEditorState,
  RiskSignal,
  Task,
} from "../../types/app";

export type RecordActionFeedback = {
  accountId: string;
  kind: "success" | "error";
  message: string;
};

type RecordActionDependencies = {
  token: string | null;
  selectedAccountId: string | null;
  recordEditor: RecordEditorState | null;
  setRecordEditor: Dispatch<SetStateAction<RecordEditorState | null>>;
  setRecordActionLoading: Dispatch<SetStateAction<boolean>>;
  setRecordActionFeedback: Dispatch<SetStateAction<RecordActionFeedback | null>>;
  setOverviewRecord: Dispatch<SetStateAction<LoadedOverview | null>>;
};

export function createRecordActions({
  token,
  selectedAccountId,
  recordEditor,
  setRecordEditor,
  setRecordActionLoading,
  setRecordActionFeedback,
  setOverviewRecord,
}: RecordActionDependencies) {
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

      setOverviewRecord((current) =>
        current?.accountId === accountId
          ? { accountId, data: refreshedOverview }
          : current,
      );
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
  return {
    mutateAccountRecord,
    handleCreateContact,
    handleCreateInteraction,
    handleCreateTask,
    handleCreateRiskSignal,
    editContact,
    editInteraction,
    editTask,
    dismissRiskSignal,
    handleSaveRecordEditor,
  };
}
