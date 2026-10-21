import type { AppPageContext } from "../types/app";
import { Badge, Panel, EmptyState, InsightResult } from "../components/shared";
import { formatDate, labelize, riskClass, statusClass } from "../lib/presentation";

export default function DocumentsAIPage({ context }: { context: AppPageContext }) {
  const {
    activeView,
    selectedAccount,
    selectedAccountId,
    overviewLoading,
    documentFile,
    setDocumentFile,
    documentTitle,
    setDocumentTitle,
    documentUploading,
    documentUploadFeedback,
    setDocumentUploadFeedback,
    documentFileInputRef,
    recordActionLoading,
    question,
    setQuestion,
    analysisLoading,
    analysisError,
    overview,
    latestInsight,
    mutateAccountRecord,
    handleDocumentUpload,
    handleAnalyzeAccount,
  } = context;

  return (
    <>
        {activeView === "ai" && (
          <div className="grid items-start gap-6 2xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <Panel
                title="Documents"
                subtitle={
                  selectedAccount
                    ? `Documents for ${selectedAccount.name}`
                    : "Select an account to view its documents."
                }
              >
                <form
                  onSubmit={handleDocumentUpload}
                  className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Upload customer evidence
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      PDF, TXT or Markdown · Maximum 10 MB. Documents are
                      processed for evidence-grounded AI analysis.
                    </p>
                  </div>

                  <label className="block text-sm font-medium text-slate-700">
                    Document title (optional)
                    <input
                      type="text"
                      value={documentTitle}
                      maxLength={200}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      disabled={!selectedAccountId || documentUploading}
                      placeholder="e.g. Quarterly account update"
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Choose document
                    <input
                      ref={documentFileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                      onChange={(event) => {
                        setDocumentFile(
                          event.currentTarget.files?.[0] ?? null,
                        );
                        setDocumentUploadFeedback(null);
                      }}
                      disabled={!selectedAccountId || documentUploading}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 disabled:bg-slate-100"
                    />
                  </label>

                  {documentUploadFeedback?.accountId === selectedAccountId && (
                    <p
                      role={
                        documentUploadFeedback.kind === "error"
                          ? "alert"
                          : "status"
                      }
                      className={`text-sm leading-5 ${
                        documentUploadFeedback.kind === "error"
                          ? "text-red-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {documentUploadFeedback.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      !selectedAccountId || !documentFile || documentUploading
                    }
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  >
                    {documentUploading ? "Uploading and processing..." : "Upload document"}
                  </button>
                </form>

                {overviewLoading ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Loading documents...
                  </p>
                ) : !overview || overview.documents.length === 0 ? (
                  <EmptyState
                    title="No documents available"
                    description="Uploaded documents will appear here when available for the selected account."
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.documents.map((document) => (
                      <article
                        key={document.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-semibold text-slate-900">
                              {document.title}
                            </h3>
                            <p className="mt-1 break-all text-xs text-slate-500">
                              {document.original_filename}
                            </p>
                          </div>
                          <Badge className={statusClass(document.ingestion_status)}>
                            {labelize(document.ingestion_status)}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {(document.size_bytes / 1024).toFixed(1)} KB ·{" "}
                          {formatDate(document.created_at)}
                        </p>
                        {document.ingestion_error_code && (
                          <p className="mt-2 text-xs text-red-700">
                            Ingestion error: {document.ingestion_error_code}
                          </p>
                        )}

                        <button
                          type="button"
                          disabled={recordActionLoading}
                          onClick={() =>
                            void mutateAccountRecord(
                              overview.account.id,
                              `/accounts/${overview.account.id}/documents/${document.id}/archive`,
                              "Document archived.",
                            )
                          }
                          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          Archive document
                        </button>
</article>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title="Recent AI analyses"
                subtitle="Past analysis runs recorded for the selected account."
              >
                {!overview || overview.recent_ai_insights.length === 0 ? (
                  <EmptyState
                    title="No AI analysis history"
                    description="Start an analysis to create the first insight for this account."
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.recent_ai_insights.map((insight) => (
                      <article
                        key={insight.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge className={statusClass(insight.status)}>
                            {labelize(insight.status)}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {formatDate(insight.created_at)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          {insight.summary ??
                            insight.error_code ??
                            "No summary recorded."}
                        </p>
                        <div className="mt-3 flex flex-col items-start gap-2">
                          {insight.suggested_risk_level && (
                            <Badge className={riskClass(insight.suggested_risk_level)}>
                              Suggested risk:{" "}
                              {labelize(insight.suggested_risk_level)}
                            </Badge>
                          )}
                          {insight.confidence && (
                            <Badge className="bg-slate-100 text-slate-700">
                              Confidence: {labelize(insight.confidence)}
                            </Badge>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel
                title="Evidence-grounded AI analysis"
                subtitle="The backend retrieves account-scoped evidence, validates model output, and saves findings with source references."
              >
                {!selectedAccountId ? (
                  <EmptyState
                    title="No account selected"
                    description="Select an assigned account to request analysis."
                  />
                ) : (
                  <form onSubmit={handleAnalyzeAccount} className="space-y-4">
                    <div>
                      <label
                        htmlFor="analysis-question"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Analysis question
                      </label>
                      <textarea
                        id="analysis-question"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        minLength={5}
                        maxLength={2000}
                        required
                        rows={5}
                        className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Use specific questions. The backend should report
                        insufficient evidence if it cannot support an answer.
                      </p>
                    </div>

                    {analysisError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                      >
                        {analysisError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={analysisLoading || overviewLoading}
                      className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {analysisLoading
                        ? "Analyzing authorized evidence..."
                        : "Run AI analysis"}
                    </button>
                  </form>
                )}
              </Panel>

              {latestInsight && <InsightResult insight={latestInsight} />}

              {overview?.recent_interactions &&
                overview.recent_interactions.length > 0 && (
                  <Panel
                    title="Recent interaction evidence"
                    subtitle="Recent account interactions that may support the AI analysis."
                  >
                    <div className="space-y-3">
                      {overview.recent_interactions.map((interaction) => (
                        <article
                          key={interaction.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">
                              {interaction.subject ??
                                labelize(interaction.interaction_type)}
                            </p>
                            <span className="text-xs text-slate-500">
                              {formatDate(interaction.occurred_at)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {interaction.summary}
                          </p>
                        </article>
                      ))}
                    </div>
                  </Panel>
                )}
            </div>
          </div>
        )}

    </>
  );
}
