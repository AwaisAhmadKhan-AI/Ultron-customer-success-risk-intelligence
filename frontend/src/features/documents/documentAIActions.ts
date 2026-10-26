import type { Dispatch, FormEvent, SetStateAction } from "react";
import { apiRequest } from "../../lib/api";
import { labelize } from "../../lib/presentation";
import type { AIInsight, AccountOverview, DocumentRecord, LoadedInsight, LoadedOverview } from "../../types/app";

type DocumentUploadFeedback = {
  accountId: string;
  kind: "success" | "error";
  message: string;
};

type DocumentAIActionDependencies = {
  token: string | null;
  selectedAccountId: string | null;
  documentFile: File | null;
  documentTitle: string;
  question: string;
  setDocumentUploadFeedback: Dispatch<SetStateAction<DocumentUploadFeedback | null>>;
  setDocumentUploading: Dispatch<SetStateAction<boolean>>;
  setDocumentFile: Dispatch<SetStateAction<File | null>>;
  setDocumentTitle: Dispatch<SetStateAction<string>>;
  setLatestInsightRecord: Dispatch<SetStateAction<LoadedInsight | null>>;
  setAnalysisError: Dispatch<SetStateAction<string | null>>;
  setOverviewRecord: Dispatch<SetStateAction<LoadedOverview | null>>;
  setOverviewError: (message: string | null) => void;
  setAnalysisLoading: Dispatch<SetStateAction<boolean>>;
};

export function createDocumentAIActions({
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
}: DocumentAIActionDependencies) {
  async function handleDocumentUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');

    const accountId = selectedAccountId;
    const file = documentFile;

    if (!token || !accountId) return;

    setDocumentUploadFeedback(null);

    if (!file) {
      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message: "Select a document to upload.",
      });
      return;
    }

    const extension = file.name.toLowerCase().split(".").pop();

    if (!extension || !["pdf", "txt", "md"].includes(extension)) {
      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message: "Only PDF, TXT and Markdown files are supported.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message: "The maximum document size is 10 MB.",
      });
      return;
    }

    setDocumentUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (documentTitle.trim()) {
        formData.append("title", documentTitle.trim());
      }

      const uploaded = await apiRequest<DocumentRecord>(
        `/accounts/${accountId}/documents`,
        {
          method: "POST",
          token,
          multipart: formData,
        },
      );

      setDocumentUploadFeedback({
        accountId,
        kind: "success",
        message: `${uploaded.original_filename} uploaded. Ingestion status: ${labelize(uploaded.ingestion_status)}.`,
      });
      setDocumentFile(null);
      setDocumentTitle("");
      setLatestInsightRecord(null);
      setAnalysisError(null);

      if (fileInput) {
        fileInput.value = "";
      }

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
        setOverviewError(
          "The document was uploaded, but the account overview could not refresh. Reload the account to see its latest status.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Document upload failed.";

      setDocumentUploadFeedback({
        accountId,
        kind: "error",
        message,
      });
    } finally {
      setDocumentUploading(false);
    }
  }

  async function handleAnalyzeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedAccountId) {
      setAnalysisError("Select an account before running AI analysis.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setLatestInsightRecord(null);

    const accountId = selectedAccountId;

    try {
      const result = await apiRequest<AIInsight>(
        `/accounts/${accountId}/ai-insights`,
        {
          method: "POST",
          token,
          json: { question },
        },
      );

      setLatestInsightRecord({
        accountId,
        data: result,
      });

      const refreshedOverview = await apiRequest<AccountOverview>(
        `/accounts/${accountId}/overview`,
        { token },
      );

      setOverviewRecord({
        accountId,
        data: refreshedOverview,
      });
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "AI analysis request failed.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  }
  return { handleDocumentUpload, handleAnalyzeAccount };
}
