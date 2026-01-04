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
  totals?: Partial<Record<string, number>>
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

  const doc = new jsPDF({
    orientation
  })

  // const pageWidth = doc.internal.pageSize.getWidth()

  /* -----------------------------
     Header
  ----------------------------- */
  doc.setFontSize(18)
  doc.text(title, 14, 20)

  if (subtitle) {
    doc.setFontSize(11)
    doc.text(subtitle, 14, 28)
  }

  /* -----------------------------
     Table data
  ----------------------------- */
  const body = rows.map(row => columns.map(col => col.accessor(row)))

  if (totals) {
    body.push(
      columns.map(col =>
        col.header === columns[0].header ? 'TOTAL' : (totals[col.header] ?? '')
      )
    )
  }

  autoTable(doc, {
    startY: subtitle ? 34 : 28,
    head: [columns.map(c => c.header)],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [
        i,
        {
          halign: c.align ?? 'left',
          cellWidth: c.width
        }
      ])
    ),
    tableWidth: 'auto'
  })

  doc.save(fileName)
}
