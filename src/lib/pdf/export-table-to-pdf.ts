import { Styles } from 'jspdf-autotable'

export type PdfOrientation = 'portrait' | 'landscape'

// lib/pdf/pdf-types.ts

export type PdfColumn<T> = {
  header: string
  accessor: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  width?: number
}

export interface ExportTableToPdfOptions<T> {
  title: string
  subtitle?: string
  columns: PdfColumn<T>[]
  rows: T[]
  totals?: Partial<Record<string, string | number>> // ✅ allow string
  fileName: string
  orientation?: PdfOrientation // ✅ new
}

export async function exportTableToPDF<T>({
  title,
  subtitle,
  columns,
  rows,
  totals,
  fileName,
  orientation = 'portrait'
}: ExportTableToPdfOptions<T>) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation })

  // -----------------------------
  // Header
  // -----------------------------
  doc.setFontSize(18)
  doc.text(title, 14, 20)

  let startY = 28
  if (subtitle) {
    doc.setFontSize(11)
    doc.text(subtitle, 14, 28)
    startY = 34 // ✅ table starts below subtitle
  } else {
    startY = 28 // ✅ table starts below title
  }

  // -----------------------------
  // Table data
  // -----------------------------
  const headers = columns.map(c => c.header)
  const body = rows.map(row => columns.map(col => col.accessor(row)))

  // ✅ ONLY ONE totals row: the footer
  const totalsRow = totals
    ? columns.map((c, idx) => {
        if (idx === 0) return 'Totals (£)'
        return totals[c.header] ?? ''
      })
    : undefined

  // Optional: map your align/width onto autotable columnStyles
  const columnStyles: Record<number, Partial<Styles>> = {}

  columns.forEach((c, i) => {
    columnStyles[i] = { halign: c.align ?? 'left' }
    if (typeof c.width === 'number') columnStyles[i].cellWidth = c.width
  })

  autoTable(doc, {
    startY, // ✅ prevents header overlap / “missing headings”
    head: [headers],
    body,
    foot: totalsRow ? [totalsRow] : undefined,
    showFoot: totalsRow ? 'lastPage' : undefined,

    // styling (optional but makes it look like your screenshot)
    headStyles: {
      fontStyle: 'bold'
    },
    footStyles: totalsRow
      ? {
          fontStyle: 'bold'
        }
      : undefined,

    didParseCell: data => {
      if (data.section === 'foot') {
        data.cell.styles.fontStyle = 'bold'
      }
    },

    // ✅ thick line above totals row
    willDrawCell: data => {
      if (data.section === 'foot') {
        const { x, y, width } = data.cell
        doc.setLineWidth(0.6)
        doc.line(x, y, x + width, y)
        doc.setLineWidth(0.2)
      }
    }
  })

  doc.save(fileName)
}
