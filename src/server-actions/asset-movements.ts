'use server'

import { db } from '@/db'
import {
  accountingPeriods,
  assetMovements,
  assetPeriodBalances
} from '@/db/schema'
import { postAssetMovementSchema } from '@/zod-schemas/asset-movements'
import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

function toNumber(v: unknown): number {
  const n = typeof v === 'string' && v.trim() === '' ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function postAssetMovementAction(input: unknown) {
  try {
    const data = postAssetMovementSchema.parse(input)

    const period = await db.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriods.id, data.periodId),
        eq(accountingPeriods.clientId, data.clientId)
      )
    })

    if (!period) return { success: false as const, error: 'Period not found' }
    if (period.status !== 'OPEN') {
      return {
        success: false as const,
        error: 'Cannot post to a closed period'
      }
    }

    if (
      data.postingDate < period.startDate ||
      data.postingDate > period.endDate
    ) {
      return {
        success: false as const,
        error: `Posting date must be within ${period.startDate} and ${period.endDate}`
      }
    }

    // Convert numbers
    const amountCostInput = round2(toNumber(data.amountCost))
    const amountDepreciationInput = round2(toNumber(data.amountDepreciation))
    const amountProceeds = round2(toNumber(data.amountProceeds))

    const disposalPctRaw =
      data.disposalPercentage != null ? toNumber(data.disposalPercentage) : null
    const disposalPct =
      disposalPctRaw == null ? null : Math.max(0, Math.min(100, disposalPctRaw))

    const EPS = 0.01 // 1p tolerance

    await db.transaction(async tx => {
      // 1) Ensure balances row exists
      await tx
        .insert(assetPeriodBalances)
        .values({
          assetId: data.assetId,
          periodId: data.periodId,

          costBfwd: '0',
          additions: '0',
          disposalsCost: '0',
          costAdjustment: '0',

          depreciationBfwd: '0',
          depreciationCharge: '0',
          depreciationOnDisposals: '0',
          depreciationAdjustment: '0'
        })
        .onConflictDoNothing({
          target: [assetPeriodBalances.assetId, assetPeriodBalances.periodId]
        })

      // 1b) Load balances row (now guaranteed to exist)
      const bal = await tx.query.assetPeriodBalances.findFirst({
        where: and(
          eq(assetPeriodBalances.assetId, data.assetId),
          eq(assetPeriodBalances.periodId, data.periodId)
        )
      })

      // Compute available cost BEFORE this movement (canonical)
      const costBfwdNow = toNumber(bal?.costBfwd ?? 0)
      const additionsNow = toNumber(bal?.additions ?? 0)
      const costAdjNow = toNumber(bal?.costAdjustment ?? 0)
      const disposalsSoFar = toNumber(bal?.disposalsCost ?? 0)

      const availableCostBefore = round2(
        costBfwdNow + additionsNow + costAdjNow - disposalsSoFar
      )

      const isFullyDisposed = availableCostBefore <= EPS

      // ---- Movement type helpers ----
      const isDisposal =
        data.movementType === 'disposal_full' ||
        data.movementType === 'disposal_partial'

      // ✅ Guard 1: block any movement if asset is already fully disposed in this period
      // (You can relax this later if you add explicit "reversal" movement types.)
      if (isFullyDisposed) {
        throw new Error(
          'This asset has been fully disposed in this period and is locked for further movements.'
        )
      }

      const pctForCalc = isDisposal
        ? (disposalPct ?? (data.movementType === 'disposal_full' ? 100 : 0))
        : 0

      const fraction = isDisposal
        ? Math.max(0, Math.min(1, pctForCalc / 100))
        : 0

      // 2) Disposal: auto-calc disposal cost AND auto-calc dep on disposals
      let disposalCostToPost: number | null = null
      let amountDepreciationToPost = amountDepreciationInput

      if (isDisposal) {
        // Auto-calc disposal cost if amountCost is 0
        if (round2(amountCostInput) === 0) {
          disposalCostToPost = round2(availableCostBefore * fraction)
        }

        // Auto-calc depreciation eliminated on disposal if user left it as 0
        if (round2(amountDepreciationInput) === 0) {
          // const depBfwd = toNumber(bal?.depreciationBfwd ?? 0)
          // const depChargeSoFar = toNumber(bal?.depreciationCharge ?? 0)
          // const depAdjSoFar = toNumber(bal?.depreciationAdjustment ?? 0)
          // const depOnDisposalsSoFar = toNumber(
          //   bal?.depreciationOnDisposals ?? 0
          // )

          // const availableAccumDep = round2(
          //   depBfwd + depChargeSoFar + depAdjSoFar - depOnDisposalsSoFar
          // )

          // amountDepreciationToPost = round2(
          //   Math.max(0, availableAccumDep) * fraction
          // )
          const depBfwd = toNumber(bal?.depreciationBfwd ?? 0)
          const depAdjSoFar = toNumber(bal?.depreciationAdjustment ?? 0)
          const depOnDisposalsSoFar = toNumber(
            bal?.depreciationOnDisposals ?? 0
          )

          // Policy: eliminate depreciation based on opening accumulated depreciation only.
          // Include depreciation adjustments (optional), but exclude current period depreciation charge.
          const availableAccumDep = round2(
            depBfwd + depAdjSoFar - depOnDisposalsSoFar
          )

          amountDepreciationToPost = round2(
            Math.max(0, availableAccumDep) * fraction
          )
        }
      }

      const finalAmountCost =
        disposalCostToPost != null ? disposalCostToPost : amountCostInput

      // ✅ Guard 2: disposal cannot exceed available cost (whether user typed a cost or we auto-calculated)
      if (isDisposal) {
        if (finalAmountCost > availableCostBefore + EPS) {
          throw new Error(
            'Disposal cost exceeds available cost for this period'
          )
        }
      }

      // 3) Insert movement row (audit trail)
      await tx.insert(assetMovements).values({
        clientId: data.clientId,
        assetId: data.assetId,
        periodId: data.periodId,
        movementType: data.movementType,
        postingDate: data.postingDate,

        amountCost: finalAmountCost.toFixed(2),

        // Store 0.00 consistently (avoids null/undefined edge cases)
        amountDepreciation: amountDepreciationToPost.toFixed(2),
        amountProceeds: amountProceeds.toFixed(2),

        disposalPercentage: isDisposal ? pctForCalc.toFixed(2) : null,
        note: data.note ?? null
      })

      // 4) Apply to balances
      switch (data.movementType) {
        case 'cost_adj': {
          await tx
            .update(assetPeriodBalances)
            .set({
              costAdjustment: sql`${assetPeriodBalances.costAdjustment} + ${finalAmountCost}`
            })
            .where(
              and(
                eq(assetPeriodBalances.assetId, data.assetId),
                eq(assetPeriodBalances.periodId, data.periodId)
              )
            )
          break
        }

        case 'depreciation_adj': {
          await tx
            .update(assetPeriodBalances)
            .set({
              depreciationAdjustment: sql`${assetPeriodBalances.depreciationAdjustment} + ${amountDepreciationToPost}`
            })
            .where(
              and(
                eq(assetPeriodBalances.assetId, data.assetId),
                eq(assetPeriodBalances.periodId, data.periodId)
              )
            )
          break
        }

        case 'revaluation': {
          await tx
            .update(assetPeriodBalances)
            .set({
              costAdjustment: sql`${assetPeriodBalances.costAdjustment} + ${finalAmountCost}`,
              depreciationAdjustment: sql`${assetPeriodBalances.depreciationAdjustment} + ${amountDepreciationToPost}`
            })
            .where(
              and(
                eq(assetPeriodBalances.assetId, data.assetId),
                eq(assetPeriodBalances.periodId, data.periodId)
              )
            )
          break
        }

        case 'disposal_full':
        case 'disposal_partial': {
          await tx
            .update(assetPeriodBalances)
            .set({
              disposalsCost: sql`${assetPeriodBalances.disposalsCost} + ${finalAmountCost}`,
              depreciationOnDisposals: sql`${assetPeriodBalances.depreciationOnDisposals} + ${amountDepreciationToPost}`,
              disposalProceeds: sql`${assetPeriodBalances.disposalProceeds} + ${amountProceeds}`
            })
            .where(
              and(
                eq(assetPeriodBalances.assetId, data.assetId),
                eq(assetPeriodBalances.periodId, data.periodId)
              )
            )
          break
        }

        default: {
          throw new Error(`Unsupported movement type: ${data.movementType}`)
        }
      }
    })

    revalidatePath(`/organisation/clients/${data.clientId}/fixed-assets`)
    revalidatePath(`/organisation/clients/${data.clientId}/accounting-periods`)

    return {
      success: true as const
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return { success: false as const, error: message }
  }
}
