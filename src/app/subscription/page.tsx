"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/browserClient";

// ─── Plan definitions ─────────────────────────────────────────────────────────

type Plan = "free" | "light" | "full";

const PLAN_RANK: Record<Plan, number> = { free: 0, light: 1, full: 2 };

interface PlanDef {
  id: Plan;
  name: string;
  price: string;
  analysesPerMonth: string;
  features: string[];
  highlight: boolean;
}

/** Static plan metadata — prices are intentionally omitted; they are fetched from Stripe at runtime. */
const PLAN_DEFS_BASE: Omit<PlanDef, "price">[] = [
  {
    id: "free",
    name: "Free",
    analysesPerMonth: "3 analyses / month",
    features: ["Floor plan analysis", "Basic measurements", "JSON export", "PDF export"],
    highlight: false,
  },
  {
    id: "light",
    name: "Light",
    analysesPerMonth: "20 analyses / month",
    features: [
      "Everything in Free",
      "Detailed measurements",
      "Spreadsheet export",
      "Priority processing",
    ],
    highlight: true,
  },
  {
    id: "full",
    name: "Full",
    analysesPerMonth: "Unlimited analyses",
    features: [
      "Everything in Light",
      "Advanced measurements",
      "API access",
      "Dedicated support",
    ],
    highlight: false,
  },
];

type PlanPrices = Record<Plan, string>;

const DEFAULT_PRICES: PlanPrices = { free: "A$0 / month", light: "…", full: "…" };

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionData {
  plan: Plan;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  scheduledChange: {
    changeType: "downgrade" | "cancel";
    targetPlan: Plan;
    effectiveAt: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function getAuthToken(): Promise<string> {
  const supabase = createBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You are not signed in.");
  return token;
}

// ─── SubscriptionPlansPage ────────────────────────────────────────────────────

export default function SubscriptionPlansPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [planPrices, setPlanPrices] = useState<PlanPrices>(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const [subRes, pricesRes] = await Promise.all([
        fetch("/api/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/subscription/prices"),
      ]);
      if (!subRes.ok) throw new Error("Failed to load subscription.");
      const subJson = (await subRes.json()) as { data: SubscriptionData };
      setSubscription(subJson.data);

      if (pricesRes.ok) {
        const pricesJson = (await pricesRes.json()) as { data: PlanPrices };
        setPlanPrices(pricesJson.data);
      }
    } catch {
      setError("Unable to load your subscription. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const handleCheckout = async (plan: Plan) => {
    setActionPending(true);
    setActionError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? "Unable to start checkout.");
      }
      const json = (await res.json()) as { data: { url: string } };
      window.location.href = json.data.url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unexpected error.");
      setActionPending(false);
    }
  };

  const handlePortal = async () => {
    setActionPending(true);
    setActionError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/subscription/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? "Unable to open billing portal.");
      }
      const json = (await res.json()) as { data: { url: string } };
      window.location.href = json.data.url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unexpected error.");
      setActionPending(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-slate-500">Loading your subscription…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      </main>
    );
  }

  const currentPlan = subscription!.plan;
  const scheduledChange = subscription!.scheduledChange;

  const PLAN_DEFS: PlanDef[] = PLAN_DEFS_BASE.map((p) => ({
    ...p,
    price: planPrices[p.id] ?? DEFAULT_PRICES[p.id],
  }));

  const activePlanDef = PLAN_DEFS.find((p) => p.id === currentPlan)!;

  return (
    <main
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      data-testid="subscription-page"
    >
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Subscription Plans</h1>
        <p className="text-slate-600 text-sm mt-1">
          Manage your subscription and billing.
        </p>
      </div>

      {/* ── Current plan summary ──────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow border border-white/50 p-5 mb-8">
        <p className="text-sm text-slate-500 font-medium mb-1">Your current plan</p>
        <p
          className="text-xl font-bold text-slate-900"
          data-testid="current-plan"
        >
          {activePlanDef.name}
        </p>

        {subscription!.currentPeriodEnd && (
          <p className="text-sm text-slate-600 mt-1" data-testid="billing-date">
            Next billing date:{" "}
            <span className="font-medium">{formatDate(subscription!.currentPeriodEnd)}</span>
          </p>
        )}

        {scheduledChange && (
          <div
            className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800"
            data-testid="scheduled-change-notice"
          >
            {scheduledChange.changeType === "cancel" ? (
              <>
                Your subscription will be cancelled on{" "}
                <span className="font-semibold" data-testid="cancellation-date">
                  {formatDate(scheduledChange.effectiveAt)}
                </span>
                . You will revert to the Free plan after that date.
              </>
            ) : (
              <>
                Your plan will change to{" "}
                <span className="font-semibold">
                  {PLAN_DEFS.find((p) => p.id === scheduledChange.targetPlan)?.name}
                </span>{" "}
                on{" "}
                <span className="font-semibold" data-testid="scheduled-change-date">
                  {formatDate(scheduledChange.effectiveAt)}
                </span>
                .
              </>
            )}
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            data-testid="payment-error"
            className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700"
          >
            {actionError}
          </div>
        )}

        {currentPlan !== "free" && (
          <button
            data-testid="manage-billing-btn"
            onClick={() => void handlePortal()}
            disabled={actionPending}
            className="mt-4 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
          >
            {actionPending ? "Redirecting…" : "Manage Billing"}
          </button>
        )}
      </div>

      {/* ── Plan cards ───────────────────────────────────────────────────────── */}
      <div className="grid gap-6 sm:grid-cols-3">
        {PLAN_DEFS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          // Free users can upgrade to any higher plan via Stripe Checkout.
          // Light users can upgrade to Full only (handled via the Customer Portal).
          // Full users have no upgrade option.
          const canUpgrade =
            PLAN_RANK[plan.id] > PLAN_RANK[currentPlan] &&
            (currentPlan === "free" || (currentPlan === "light" && plan.id === "full"));

          return (
            <div
              key={plan.id}
              data-testid={`plan-card-${plan.id}`}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                isCurrent
                  ? "border-blue-500 bg-blue-50/60 shadow-md"
                  : plan.highlight
                  ? "border-indigo-200 bg-white shadow-sm"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              {isCurrent && (
                <span
                  data-testid="current-plan-badge"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full"
                >
                  Current Plan
                </span>
              )}

              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                <p className="text-slate-500 text-sm mt-0.5" data-testid={`plan-price-${plan.id}`}>{plan.price}</p>
                <p className="text-slate-600 text-xs mt-1 font-medium">
                  {plan.analysesPerMonth}
                </p>
              </div>

              <ul className="space-y-1.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <svg
                      className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Upgrade button — shown for Free users (checkout) or Light users upgrading to Full (portal) */}
              {canUpgrade && (
                <button
                  data-testid={`upgrade-btn-${plan.id}`}
                  onClick={() =>
                    currentPlan !== "free"
                      ? void handlePortal()
                      : void handleCheckout(plan.id)
                  }
                  disabled={actionPending}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {actionPending ? "Redirecting…" : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
