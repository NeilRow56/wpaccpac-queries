// src/server-actions/planning-docs-rollforward.ts
'use server'

import { db } from '@/db'
import { revalidatePath } from 'next/cache'
import { rollForwardPlanningDocsTx } from '@/server-actions/_helpers/rollforward-planning-docs'

export type RollForwardInput = {
  clientId: string
  fromPeriodId: string
  toPeriodId: string
  overwrite?: boolean
  resetComplete?: boolean
  upgradeHeadings?: boolean
}

export async function rollForwardPlanningDocsAction(input: RollForwardInput) {
  const res = await db.transaction(async tx => {
    return rollForwardPlanningDocsTx({ tx, ...input })
  })

  // Only revalidate if we actually succeeded
  if (res.success) {
    const { clientId, toPeriodId } = input
    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${toPeriodId}/planning`
    )
  }

  return res
}
