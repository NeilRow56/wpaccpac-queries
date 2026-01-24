export type LineItemScheduleRowV1 = {
  id: string
  name: string
  description: string
  current: number | null
  prior: number | null
}

export type LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE'
  version: 1
  title: string
  rows: LineItemScheduleRowV1[]
}
