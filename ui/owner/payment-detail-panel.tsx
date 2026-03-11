"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DetailPlaceholderPanel } from "@/modules/core/components/detail-placeholder-panel";
import { formatCredits } from "@/modules/core/mock-data";
import type { EdenOwnerCreditsTopUpPaymentDetail } from "@/modules/core/services/payment-inspection-service";

type OwnerPaymentDetailPanelProps = {
  paymentDetail: EdenOwnerCreditsTopUpPaymentDetail;
};

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function getPaymentStatusTone(status: "pending" | "settled" | "failed" | "canceled") {
  if (status === "settled") {
    return "success" as const;
  }

  if (status === "pending") {
    return "warning" as const;
  }

  if (status === "failed") {
    return "danger" as const;
  }

  return "default" as const;
}

function getPaymentStatusClasses(status: "pending" | "settled" | "failed" | "canceled") {
  if (status === "settled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatPaymentStatus(status: "pending" | "settled" | "failed" | "canceled") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getEventStatusClasses(status: "info" | "success" | "skipped" | "failed") {
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "skipped") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function formatPaymentEventStatus(status: "info" | "success" | "skipped" | "failed") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getOwnerActionLinkClasses() {
  return "inline-flex rounded-full border border-eden-edge bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg";
}

function formatMoneyAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function OwnerPaymentDetailPanel({
  paymentDetail,
}: OwnerPaymentDetailPanelProps) {
  const { payment, relatedUser, packageInfo, settlementResultLabel, recentEventLogs } =
    paymentDetail;
  const paymentSummaryCards = [
    {
      id: "payment-summary-status",
      label: "Payment status",
      value: formatPaymentStatus(payment.status),
      detail: `Settlement state: ${settlementResultLabel}`,
      badge: formatPaymentStatus(payment.status),
      badgeClasses: getPaymentStatusClasses(payment.status),
    },
    {
      id: "payment-summary-credits",
      label: "Leaf’s amount",
      value: formatCredits(payment.creditsAmount),
      detail: formatMoneyAmount(payment.amountCents, payment.currency),
    },
    {
      id: "payment-summary-package",
      label: "Package or offer",
      value: packageInfo?.title ?? "Not available",
      detail: packageInfo?.chargeLabel ?? "No package charge label recorded.",
    },
    {
      id: "payment-summary-user",
      label: "Related user",
      value: relatedUser
        ? `${relatedUser.displayName} (@${relatedUser.username})`
        : payment.userId
          ? `Unknown user (${payment.userId})`
          : "No linked user",
      detail: relatedUser
        ? "Use Inspect Related User for the owner wallet context."
        : "No durable user link was resolved for this payment.",
    },
    {
      id: "payment-summary-created",
      label: "Created",
      value: payment.createdAtLabel,
      detail: payment.providerLabel,
    },
    {
      id: "payment-summary-settled",
      label: "Settled",
      value: payment.settledAtLabel ?? "Awaiting settlement",
      detail: payment.failureReason ?? "No failure reason recorded.",
    },
  ];

  return (
    <div className="space-y-5">
      <DetailPlaceholderPanel
        eyebrow="Owner Payment Detail"
        title={`${payment.providerLabel} top-up reconciliation`}
        description="Owner-facing payment drill-down for persistent top-up records, webhook lifecycle events, and settlement audit visibility."
        status={payment.status}
        statusTone={getPaymentStatusTone(payment.status)}
        tags={[
          payment.providerLabel,
          packageInfo?.title ?? "Package unavailable",
          paymentDetail.source === "persistent" ? "Persistent payment" : "Fallback",
        ]}
        summary={`This route reuses the current persistent payment record and event log services for ${payment.providerSessionId}. The browser return flow remains non-authoritative; Stripe webhook settlement and recorded event history drive the state shown here.`}
        metadata={[
          {
            label: "Related user",
            value: relatedUser
              ? `${relatedUser.displayName} (@${relatedUser.username})`
              : payment.userId
                ? `Unknown user (${payment.userId})`
                : "Unlinked user",
          },
          { label: "Leaf’s amount", value: formatCredits(payment.creditsAmount) },
          {
            label: "Charge",
            value: formatMoneyAmount(payment.amountCents, payment.currency),
          },
          { label: "Package", value: packageInfo?.title ?? "Not recorded" },
          { label: "Settlement result", value: settlementResultLabel },
          { label: "Created", value: payment.createdAtLabel },
          { label: "Settled", value: payment.settledAtLabel ?? "Awaiting settlement" },
          { label: "Payment ID", value: payment.id },
        ]}
        actions={[
          { label: "Return to Control Room", href: "/owner#transaction-flow" },
          relatedUser
            ? {
                label: "Inspect Related User",
                href: `/owner/users/${relatedUser.id}`,
              }
            : { label: "Back to Owner Layer", href: "/owner" },
          {
            label: "Open Consumer Wallet Surface",
            href: "/consumer",
            tone: "secondary",
          },
        ]}
        backHref="/owner"
        backLabel="Back to Control Room"
        note="This payment view is inspection-only. Top-up settlement remains driven by the Stripe webhook path; no owner action here changes the wallet."
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.4),rgba(255,255,255,0.96))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Payment Operational Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Compact owner reconciliation header for the current payment before the full provider references and event timeline below.
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getPaymentStatusClasses(
                  payment.status,
                )}`}
              >
                {formatPaymentStatus(payment.status)}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {paymentSummaryCards.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-eden-edge bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                      {item.label}
                    </p>
                    {"badge" in item && item.badge && item.badgeClasses ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${item.badgeClasses}`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedUser ? (
                <Link
                  href={`/owner/users/${relatedUser.id}`}
                  className={getOwnerActionLinkClasses()}
                >
                  Inspect Related User
                </Link>
              ) : null}
              <Link
                href="/owner#transaction-flow"
                className={getOwnerActionLinkClasses()}
              >
                View Payment Feed
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-2xl border border-eden-edge bg-[linear-gradient(135deg,rgba(219,234,254,0.45),rgba(255,255,255,0.96))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Payment Financial Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Current top-up state with related wallet Leaf’s, selected package when known,
                    and owner-visible settlement status.
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getPaymentStatusClasses(
                    payment.status,
                  )}`}
                >
                  {formatPaymentStatus(payment.status)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-eden-edge bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Leaf’s added
                  </p>
                  <p className="mt-2 text-lg font-semibold text-eden-ink">
                    {formatCredits(payment.creditsAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Charged amount
                  </p>
                  <p className="mt-2 text-lg font-semibold text-eden-ink">
                    {formatMoneyAmount(payment.amountCents, payment.currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Package or offer
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {packageInfo?.title ?? "Not recorded"}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    {packageInfo?.chargeLabel ?? "No package charge label available."}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Settlement result
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {settlementResultLabel}
                  </p>
                  <p className="mt-1 text-xs text-eden-muted">
                    {payment.failureReason ?? "No failure reason recorded."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-eden-edge bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    Provider references
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    Stable references used for reconciliation between Eden payment records and the
                    upstream provider lifecycle.
                  </p>
                </div>
                <Link
                  href="/owner#transaction-flow"
                  className={getOwnerActionLinkClasses()}
                >
                  View Payment Feed
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Provider
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {payment.providerLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Checkout session
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-eden-ink">
                    {payment.providerSessionId}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Payment intent
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-eden-ink">
                    {payment.providerPaymentIntentId ?? "Not recorded"}
                  </p>
                </div>
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                    Related user
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">
                    {relatedUser
                      ? `${relatedUser.displayName} (@${relatedUser.username})`
                      : payment.userId
                        ? `Unknown user (${payment.userId})`
                        : "No linked user"}
                  </p>
                  {relatedUser ? (
                    <div className="mt-3">
                      <Link
                        href={`/owner/users/${relatedUser.id}`}
                        className={getOwnerActionLinkClasses()}
                      >
                        Inspect Related User
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-eden-edge bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                  Event timeline
                </p>
                <p className="mt-2 text-sm leading-6 text-eden-muted">
                  Persistent payment lifecycle trail for this payment, including checkout creation,
                  webhook receipt, settlement, skipped duplicate settlement, and failure signals.
                </p>
              </div>
              <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
                {recentEventLogs.length} events
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {recentEventLogs.length ? (
                recentEventLogs.map((eventLog) => (
                  <div
                    key={eventLog.id}
                    className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-eden-ink">
                            {eventLog.eventTypeLabel}
                          </p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${getEventStatusClasses(
                              eventLog.status,
                            )}`}
                          >
                            {formatPaymentEventStatus(eventLog.status)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs leading-5 text-eden-muted">
                          {eventLog.providerEventId ? (
                            <p className="break-all">
                              Provider event:{" "}
                              <span className="font-mono">{eventLog.providerEventId}</span>
                            </p>
                          ) : null}
                          {eventLog.providerSessionId ? (
                            <p className="break-all">
                              Session: <span className="font-mono">{eventLog.providerSessionId}</span>
                            </p>
                          ) : null}
                          {eventLog.metadataSummary.length ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {eventLog.metadataSummary.map((summaryLine) => (
                                <span
                                  key={`${eventLog.id}-${summaryLine}`}
                                  className="rounded-full bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted"
                                >
                                  {summaryLine}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {eventLog.relatedUserId ? (
                            <div className="mt-3">
                              <Link
                                href={`/owner/users/${eventLog.relatedUserId}`}
                                className={getOwnerActionLinkClasses()}
                              >
                                Inspect Related User
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                          Logged
                        </p>
                        <p className="mt-1 text-sm font-semibold text-eden-ink">
                          {eventLog.createdAtLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4 text-sm leading-6 text-eden-muted">
                  No persistent payment event logs are available for this payment yet.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </DetailPlaceholderPanel>
    </div>
  );
}
