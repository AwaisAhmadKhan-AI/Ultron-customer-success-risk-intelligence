import type { FormEvent } from "react";
import { Badge, filterInputClass } from "../shared";

type LoginPageProps = {
  email: string;
  password: string;
  loginLoading: boolean;
  loginError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export default function LoginPage({
  email,
  password,
  loginLoading,
  loginError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginPageProps) {
  return (
      <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative">
            <div className="text-2xl font-bold tracking-[0.2em]">ULTRON</div>
            <div className="mt-1 text-sm text-slate-400">
              Customer Success Intelligence
            </div>
          </div>

          <div className="relative max-w-xl pb-10">
            <Badge className="bg-indigo-400/15 text-indigo-200">
              Internal workspace
            </Badge>
            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight">
              Turn account signals into better customer decisions.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
              Review account risk, follow customer interactions, track open
              tasks, and request evidence-grounded AI analysis in one workspace.
            </p>
          </div>

          <p className="relative text-xs text-slate-500">
            Access is limited to your assigned customer accounts.
          </p>
        </section>

        <section className="flex items-center justify-center bg-slate-50 p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <p className="text-xl font-bold tracking-[0.2em] text-slate-950">
                ULTRON
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Customer Success Intelligence
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                Secure access
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Sign in
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Sign in with your assigned customer success account.
              </p>

              {loginError && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    className={filterInputClass}
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    className={filterInputClass}
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? "Signing in..." : "Sign in securely"}
                </button>
              </form>

              <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                The backend must be running and configured to allow this
                frontend origin. No demo credentials are embedded here.
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              ULTRON · Customer Success Risk Intelligence Platform
            </p>
          </div>
        </section>
      </main>
  );
}
