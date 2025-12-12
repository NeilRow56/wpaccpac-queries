export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'WpAccPac'

export const APP_ADDRESS1 =
  process.env.NEXT_PUBLIC_APP_ADDRESS1 || '28 Stag Road, Rothwell'
export const APP_ADDRESS2 =
  process.env.NEXT_PUBLIC_APP_ADDRESS2 ||
  'Kettering NN14 6GD. Telephone 07887653034'
export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  'A modern application built with Next.js'

export const EMAIL_SENDER_ADDRESS = process.env.EMAIL_SENDER_ADDRESS

export const entity_types = [
  { id: 'ST', description: 'Sole Trader' },
  { id: 'P', description: 'Partnership' },
  { id: 'LCT', description: 'Limited company - tiny' },
  { id: 'LCS', description: 'Limited company - small' },
  { id: 'LCM', description: 'Limited company - medium' },
  { id: 'O', description: 'Other' }
] as const

//Create a lookup map from id -> description
export const entityTypeMap: Record<string, string> = Object.fromEntries(
  entity_types.map(et => [et.id, et.description])
)

export const entityTypeList = entity_types.map(et => ({
  id: et.id,
  label: et.description
}))
