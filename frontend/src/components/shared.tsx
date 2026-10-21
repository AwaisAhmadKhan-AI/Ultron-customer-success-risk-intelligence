import type { ReactNode } from "react";
import type { Account, AccountOverview, AIInsight } from "../types/app";
import { formatDate, labelize, riskClass, statusClass } from "../lib/presentation";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
        <div>
          <h2 className="font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string | number;
  note: string;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    </article>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export const filterInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AccountTable({
  accounts,
  selectedAccountId,
  loading,
  onSelect,
}: {
  accounts: Account[];
  selectedAccountId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading accounts from the backend...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="No matching accounts"
        description="Try changing the search terms or filters. Only accounts assigned to your user are returned."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3 font-semibold">Account</th>
            <th className="px-3 py-3 font-semibold">Risk</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Renewal</th>
            <th className="px-3 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const selected = selectedAccountId === account.id;

            return (
              <tr
                key={account.id}
                className={`border-b border-slate-100 last:border-0 ${
                  selected ? "bg-indigo-50/50" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-3 py-4">
                  <button
                    type="button"
                    onClick={() => onSelect(account.id)}
                    className="text-left"
                  >
                    <span className="block font-semibold text-slate-900 hover:text-indigo-700">
                      {account.name}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-slate-400">
                      {account.id}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-4">
                  <Badge className={riskClass(account.risk_level)}>
                    {labelize(account.risk_level)}
                  </Badge>
                </td>
                <td className="px-3 py-4">
                  <Badge className={statusClass(account.status)}>
                    {labelize(account.status)}
                  </Badge>
                </td>
                <td className="px-3 py-4 text-slate-600">
                  {formatDate(account.renewal_date)}
                </td>
                <td className="px-3 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(account.id)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                  >
                    Select
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SelectedAccountPanel({
  account,
  overview,
  loading,
  error,
  onOpenTasks,
  onOpenAI,
}: {
  account: Account | null;
  overview: AccountOverview | null;
  loading: boolean;
  error: string | null;
  onOpenTasks: () => void;
  onOpenAI: () => void;
}) {
  return (
    <Panel
      title="Selected account"
      subtitle="Account details and its authorized overview."
      action={
        account?.risk_level ? (
          <Badge className={riskClass(account.risk_level)}>
            {labelize(account.risk_level)} risk
          </Badge>
        ) : undefined
      }
    >
      {!account ? (
        <EmptyState
          title="No account selected"
          description="When an assigned account is available, its details will appear here."
        />
      ) : (
        <>
          <h3 className="break-words text-xl font-semibold tracking-tight text-slate-950">
            {account.name}
          </h3>
          <p className="mt-2 break-all font-mono text-[11px] text-slate-400">
            {account.id}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-2">
                <Badge className={statusClass(account.status)}>
                  {labelize(account.status)}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Renewal date</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatDate(account.renewal_date)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Contacts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {loading ? "—" : (overview?.contacts.length ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Risk signals</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {loading ? "—" : (overview?.risk_signals.length ?? 0)}
              </p>
            </div>
          </div>

          {loading && (
            <p className="mt-4 text-sm text-slate-500">
              Loading account details...
            </p>
          )}

          {error && (
            <div role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenTasks}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              Review tasks
            </button>
            <button
              type="button"
              onClick={onOpenAI}
              className="rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Open AI workspace
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}

export function InsightResult({ insight }: { insight: AIInsight }) {
  return (
    <Panel
      title="Latest analysis result"
      subtitle="AI findings are advisory and do not modify the stored account risk level."
      action={
        <Badge className={statusClass(insight.status)}>
          {labelize(insight.status)}
        </Badge>
      }
    >
      {insight.error_code && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Analysis did not complete successfully. Error code:{" "}
          <strong>{insight.error_code}</strong>
        </div>
      )}

      {insight.summary && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {insight.summary}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col items-start gap-2">
        {insight.suggested_risk_level && (
          <Badge className={riskClass(insight.suggested_risk_level)}>
            Suggested risk: {labelize(insight.suggested_risk_level)}
          </Badge>
        )}
        {insight.confidence && (
          <Badge className="bg-slate-100 text-slate-700">
            Confidence: {labelize(insight.confidence)}
          </Badge>
        )}
      </div>

      {insight.risk_factors && insight.risk_factors.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Risk factors</h3>
          <div className="mt-3 space-y-3">
            {insight.risk_factors.map((factor, index) => (
              <article
                key={`${factor.description}-${index}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm leading-6 text-slate-700">
                  {factor.description}
                </p>
                {factor.evidence && (
                  <p className="mt-2 break-all text-xs text-slate-500">
                    References:{" "}
                    {factor.evidence
                      .map((reference) => reference.source_id)
                      .join(", ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {insight.recommended_actions &&
        insight.recommended_actions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Recommended actions
            </h3>
            <div className="mt-3 space-y-3">
              {insight.recommended_actions.map((recommendation, index) => (
                <article
                  key={`${recommendation.action}-${index}`}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-800">
                    {recommendation.action}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {recommendation.rationale}
                  </p>
                  {recommendation.evidence && (
                    <p className="mt-2 break-all text-xs text-slate-500">
                      References:{" "}
                      {recommendation.evidence
                        .map((reference) => reference.source_id)
                        .join(", ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">
          Verified source citations
        </h3>

        {insight.evidence.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            No verified citations were returned for this analysis.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {insight.evidence.map((evidence) => (
              <article
                key={evidence.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {evidence.source_title}
                  </p>
                  <Badge className="bg-white text-slate-600 ring-1 ring-slate-200">
                    {labelize(evidence.source_type)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(evidence.source_date)} · Citation{" "}
                  {evidence.citation_order}
                </p>
                <blockquote className="mt-3 border-l-2 border-indigo-300 pl-3 text-sm leading-6 text-slate-700">
                  {evidence.excerpt}
                </blockquote>
                {evidence.claim_supported && (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Supports: {evidence.claim_supported}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
