import type { Dispatch, FormEvent, SetStateAction } from "react";
import { apiRequest } from "../../lib/api";
import type { Account, AccountEditorState } from "../../types/app";

type AccountDirectoryFeedback = {
  kind: "success" | "error";
  message: string;
};

type AccountActionDependencies = {
  token: string | null;
  accountEditor: AccountEditorState | null;
  selectedAccount: Account | null;
  accountSaving: boolean;
  setSelectedAccountId: Dispatch<SetStateAction<string | null>>;
  setAccountDirectoryFeedback: Dispatch<SetStateAction<AccountDirectoryFeedback | null>>;
  setAccountEditorError: Dispatch<SetStateAction<string | null>>;
  setAccountSaving: Dispatch<SetStateAction<boolean>>;
  setSearch: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  setRiskFilter: Dispatch<SetStateAction<string>>;
  setRenewalFilter: Dispatch<SetStateAction<string>>;
  setOpenTasksFilter: Dispatch<SetStateAction<string>>;
  setIncludeArchived: Dispatch<SetStateAction<boolean>>;
  setPage: Dispatch<SetStateAction<number>>;
  setAccountsError: Dispatch<SetStateAction<string | null>>;
  setAccountEditor: Dispatch<SetStateAction<AccountEditorState | null>>;
  setAccountRefreshKey: Dispatch<SetStateAction<number>>;
};

export function createAccountActions({
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
}: AccountActionDependencies) {
  function formString(data: FormData, key: string): string {
    const value = data.get(key);
    return typeof value === "string" ? value.trim() : "";
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
  return { handleSaveAccount, toggleSelectedAccountArchive };
}
