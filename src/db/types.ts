// db/types.ts
// db/types.ts
// db/types.ts
import { user, member, clients, costCentres, accountsPeriods } from './schema'

// Manually define the schema type for Drizzle transactions
export type DBSchema = {
  user: typeof user
  member: typeof member
  clients: typeof clients
  costCentres: typeof costCentres
  accountsPeriods: typeof accountsPeriods
}
