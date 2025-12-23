// src/types/jspdf-autotable.d.ts
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF
    lastAutoTable: {
      finalY: number
    }
    previousAutoTable: {
      finalY: number
    }
  }
}

declare module 'jspdf-autotable' {
  export interface UserOptions {
    head?: RowInput[]
    body?: RowInput[]
    foot?: RowInput[]
    startY?: number | false
    margin?: Margin
    pageBreak?: 'auto' | 'avoid' | 'always'
    tableWidth?: 'auto' | 'wrap' | number
    showHead?: 'everyPage' | 'firstPage' | 'never'
    showFoot?: 'everyPage' | 'lastPage' | 'never'
    theme?: 'striped' | 'grid' | 'plain'
    styles?: Partial<Styles>
    headStyles?: Partial<Styles>
    bodyStyles?: Partial<Styles>
    footStyles?: Partial<Styles>
    alternateRowStyles?: Partial<Styles>
    columnStyles?: { [key: string]: Partial<Styles> }
    didDrawPage?: (data: HookData) => void
    didDrawCell?: (data: CellHookData) => void
    willDrawCell?: (data: CellHookData) => void
    didParseCell?: (data: CellHookData) => void
    horizontalPageBreak?: boolean
    horizontalPageBreakRepeat?: number | number[]
  }

  export type RowInput = string[] | { [key: string]: string | number }

  export interface Margin {
    top?: number
    right?: number
    bottom?: number
    left?: number
    horizontal?: number
    vertical?: number
  }

  export interface Styles {
    font?: string
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'
    overflow?: 'linebreak' | 'ellipsize' | 'visible' | 'hidden'
    fillColor?: number | number[] | string | false
    textColor?: number | number[] | string
    cellWidth?: 'auto' | 'wrap' | number
    minCellHeight?: number
    minCellWidth?: number
    halign?: 'left' | 'center' | 'right'
    valign?: 'top' | 'middle' | 'bottom'
    fontSize?: number
    cellPadding?: Padding
    lineColor?: number | number[] | string
    lineWidth?: number
  }

  export interface Padding {
    top?: number
    right?: number
    bottom?: number
    left?: number
    horizontal?: number
    vertical?: number
  }

  export interface HookData {
    table: Table
    pageNumber: number
    pageCount: number
    settings: UserOptions
    doc: jsPDF
    cursor: { x: number; y: number }
  }

  export interface CellHookData extends HookData {
    cell: Cell
    row: Row
    column: Column
    section: 'head' | 'body' | 'foot'
  }

  export interface Table {
    head: Row[]
    body: Row[]
    foot: Row[]
  }

  export interface Row {
    cells: { [key: string]: Cell }
    section: 'head' | 'body' | 'foot'
    raw: RowInput
    index: number
  }

  export interface Cell {
    raw: string | number
    text: string[]
    styles: Styles
    section: 'head' | 'body' | 'foot'
    colSpan: number
    rowSpan: number
  }

  export interface Column {
    dataKey: string | number
    index: number
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void
}
