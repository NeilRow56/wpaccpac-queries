import { Column, RowData } from '@tanstack/react-table'
import React from 'react'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterComponent?: React.FC<{ column: Column<TData, TValue> }>
  }

  interface TableMeta<TData extends RowData> {
    onDelete?: (item: TData) => void
    onEdit?: (item: TData) => void
  }
}
