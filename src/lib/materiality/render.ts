// src/planning/B41/render.ts
// Generates the B41 Materiality markdown from Period Setup inputs.
//
// Key rules (matches your Excel / screenshots):
// - Turnover basis = turnover × band %
// - Net profit basis = net profit × 10%
// - Average of all *available* bases (curr/prior turnover + curr/prior profit)
// - Materiality = max(round(average), £1,000)
// - Tolerable error = round(materiality × 50%)
// - Derived thresholds use standard fractions, rounded to whole pounds
//
// Output requirements:
// - Heading should be larger AND bold: "# **Materiality and tolerable error**"
// - Show turnover percentage used in turnover basis lines.

import type { PeriodSetupDocV1 } from '@/lib/periods/period-setup'

type MaterialityInputs = {
  turnoverCurrent: number | null
  turnoverPrior: number | null
  netProfitCurrent: number | null
  netProfitPrior: number | null
}

type MaterialityComputed = {
  turnoverRateCurrent: number | null // e.g. 4.0 (%)
  turnoverRatePrior: number | null
  turnoverBasisCurrent: number | null
  turnoverBasisPrior: number | null
  profitRate: number // 10 (%)
  profitBasisCurrent: number | null
  profitBasisPrior: number | null
  averageOfAvailable: number | null

  materiality: number | null
  materialityMinApplied: number
  materialityX1_5: number | null

  tolerableError: number | null
  tolerableErrorHalf: number | null
  tolerableErrorQuarter: number | null
  tolerableErrorTenth: number | null
}

const PROFIT_RATE_PCT = 10 // 10%
const MIN_MATERIALITY = 1000

function round0(n: number): number {
  return Math.round(n)
}

function fmtMoney0(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

function fmtMoney2(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

function fmtPct(ratePct: number): string {
  return `${ratePct.toFixed(1)}%`
}

function turnoverRatePctFor(turnover: number): number {
  // Bands per your Excel:
  // 0–500k: 4.0%
  // 500,001–1m: 2.5%
  // 1,000,001–2m: 2.0%
  // 2,000,001–5m: 1.5%
  // >5m: 1.0%
  if (turnover <= 500_000) return 4.0
  if (turnover <= 1_000_000) return 2.5
  if (turnover <= 2_000_000) return 2.0
  if (turnover <= 5_000_000) return 1.5
  return 1.0
}

function basisFromAmountPct(amount: number, ratePct: number): number {
  return (amount * ratePct) / 100
}

function avgAvailable(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number')
  if (present.length === 0) return null
  const total = present.reduce((a, b) => a + b, 0)
  return total / present.length
}

function computeMateriality(inputs: MaterialityInputs): MaterialityComputed {
  const turnoverRateCurrent =
    inputs.turnoverCurrent != null
      ? turnoverRatePctFor(inputs.turnoverCurrent)
      : null
  const turnoverRatePrior =
    inputs.turnoverPrior != null
      ? turnoverRatePctFor(inputs.turnoverPrior)
      : null

  const turnoverBasisCurrent =
    inputs.turnoverCurrent != null && turnoverRateCurrent != null
      ? basisFromAmountPct(inputs.turnoverCurrent, turnoverRateCurrent)
      : null

  const turnoverBasisPrior =
    inputs.turnoverPrior != null && turnoverRatePrior != null
      ? basisFromAmountPct(inputs.turnoverPrior, turnoverRatePrior)
      : null

  const profitBasisCurrent =
    inputs.netProfitCurrent != null
      ? basisFromAmountPct(inputs.netProfitCurrent, PROFIT_RATE_PCT)
      : null

  const profitBasisPrior =
    inputs.netProfitPrior != null
      ? basisFromAmountPct(inputs.netProfitPrior, PROFIT_RATE_PCT)
      : null

  const averageOfAvailable = avgAvailable([
    turnoverBasisCurrent,
    profitBasisCurrent,
    turnoverBasisPrior,
    profitBasisPrior
  ])

  const materialityRaw =
    averageOfAvailable != null ? round0(averageOfAvailable) : null
  const materiality =
    materialityRaw != null ? Math.max(materialityRaw, MIN_MATERIALITY) : null

  const materialityX1_5 = materiality != null ? round0(materiality * 1.5) : null

  const tolerableError = materiality != null ? round0(materiality * 0.5) : null
  const tolerableErrorHalf =
    tolerableError != null ? round0(tolerableError / 2) : null
  const tolerableErrorQuarter =
    tolerableError != null ? round0(tolerableError / 4) : null
  const tolerableErrorTenth =
    tolerableError != null ? round0(tolerableError / 10) : null

  return {
    turnoverRateCurrent,
    turnoverRatePrior,
    turnoverBasisCurrent,
    turnoverBasisPrior,
    profitRate: PROFIT_RATE_PCT,
    profitBasisCurrent,
    profitBasisPrior,
    averageOfAvailable,

    materiality,
    materialityMinApplied: MIN_MATERIALITY,
    materialityX1_5,

    tolerableError,
    tolerableErrorHalf,
    tolerableErrorQuarter,
    tolerableErrorTenth
  }
}

function buildMarkdown(inputs: MaterialityInputs): string {
  const c = computeMateriality(inputs)

  // If nothing to compute, return a helpful stub (keeps template usable)
  if (
    c.averageOfAvailable == null ||
    c.materiality == null ||
    c.tolerableError == null
  ) {
    return [
      `# **Materiality and tolerable error**`,
      ``,
      `Enter turnover and/or net profit in **Period setup** to calculate materiality.`,
      ``,
      `## Inputs and workings`,
      ``,
      `- Current turnover: ${inputs.turnoverCurrent != null ? fmtMoney2(inputs.turnoverCurrent) : '—'}`,
      `- Current net profit: ${inputs.netProfitCurrent != null ? fmtMoney2(inputs.netProfitCurrent) : '—'}`,
      `- Prior turnover: ${inputs.turnoverPrior != null ? fmtMoney2(inputs.turnoverPrior) : '—'}`,
      `- Prior net profit: ${inputs.netProfitPrior != null ? fmtMoney2(inputs.netProfitPrior) : '—'}`
    ].join('\n')
  }

  const lines: string[] = []

  // ✅ Bigger + bold heading
  lines.push(`# **Materiality and tolerable error**`)
  lines.push(``)

  lines.push(`## Values calculated according to standard practice`)
  lines.push(``)

  // Summary values (cleaner than tables in your current UI)
  lines.push(`**Materiality:** ${fmtMoney0(c.materiality)}`)
  lines.push(
    `- Vouching limit (e.g. if petty cash turnover is below materiality, do not vouch).`
  )
  lines.push(``)

  lines.push(
    `**1½ × materiality:** ${c.materialityX1_5 != null ? fmtMoney0(c.materialityX1_5) : '—'}`
  )
  lines.push(`- Limit for straight-line HP interest.`)
  lines.push(``)

  lines.push(`**Tolerable error:** ${fmtMoney0(c.tolerableError)}`)
  lines.push(``)

  lines.push(
    `**½ tolerable error:** ${c.tolerableErrorHalf != null ? fmtMoney0(c.tolerableErrorHalf) : '—'}`
  )
  lines.push(
    `- Control account differences; limit for expense variances; + provision for deferred taxation.`
  )
  lines.push(``)

  lines.push(
    `**¼ tolerable error:** ${c.tolerableErrorQuarter != null ? fmtMoney0(c.tolerableErrorQuarter) : '—'}`
  )
  lines.push(`- Write off control account differences.`)
  lines.push(``)

  lines.push(
    `**1/10 tolerable error:** ${c.tolerableErrorTenth != null ? fmtMoney0(c.tolerableErrorTenth) : '—'}`
  )
  lines.push(`- Ignore accruals and prepayments.`)
  lines.push(``)

  lines.push(`---`)
  lines.push(``)
  lines.push(`## Inputs and workings`)
  lines.push(``)

  // ✅ Turnover % shown (current + prior)
  lines.push(
    `- Current turnover basis (${c.turnoverRateCurrent != null ? fmtPct(c.turnoverRateCurrent) : '—'}): ${
      c.turnoverBasisCurrent != null ? fmtMoney2(c.turnoverBasisCurrent) : '—'
    }`
  )
  lines.push(
    `- Current net profit basis (${c.profitRate}%): ${
      c.profitBasisCurrent != null ? fmtMoney2(c.profitBasisCurrent) : '—'
    }`
  )
  lines.push(
    `- Prior turnover basis (${c.turnoverRatePrior != null ? fmtPct(c.turnoverRatePrior) : '—'}): ${
      c.turnoverBasisPrior != null ? fmtMoney2(c.turnoverBasisPrior) : '—'
    }`
  )
  lines.push(
    `- Prior net profit basis (${c.profitRate}%): ${
      c.profitBasisPrior != null ? fmtMoney2(c.profitBasisPrior) : '—'
    }`
  )
  lines.push(``)

  // Average + min rule note
  lines.push(
    `**Average of available values:** ${fmtMoney2(c.averageOfAvailable)} (minimum materiality applied: ${fmtMoney0(
      c.materialityMinApplied
    )})`
  )
  lines.push(``)
  lines.push(
    `_Note: Calculated according to the firm’s standard approach. No departures are expected unless specifically documented._`
  )

  return lines.join('\n')
}

/**
 * Main entry point used by the planning renderer.
 * Call this with the Period Setup doc for the period.
 */
export function renderB41MaterialityFromPeriodSetup(
  doc: PeriodSetupDocV1
): string {
  const inputs: MaterialityInputs = {
    turnoverCurrent: doc.materiality.turnover.current,
    turnoverPrior: doc.materiality.turnover.prior,
    netProfitCurrent: doc.materiality.netProfit.current,
    netProfitPrior: doc.materiality.netProfit.prior
  }

  return buildMarkdown(inputs)
}

/**
 * Optional: lower-level export (handy for unit tests).
 */
export function renderB41MaterialityMarkdown(
  inputs: MaterialityInputs
): string {
  return buildMarkdown(inputs)
}
