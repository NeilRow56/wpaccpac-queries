import { createSafeActionClient } from 'next-safe-action'

import { z } from 'zod/v4'

export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({
      actionName: z.string()
    })
  },

  handleServerError(e) {
    if (e.constructor.name === 'NeonDbError') {
      return 'Database Error: Your data did not save. Support will be notified.'
    }

    return e.message
  }
})
