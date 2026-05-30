import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "./DataTable";

type DataPreviewTableProps<TData> = {
  rows: TData[];
  columns: ColumnDef<TData, unknown>[];
};

export function DataPreviewTable<TData>({ rows, columns }: DataPreviewTableProps<TData>) {
  return <DataTable title="Data Preview" description="Structured preview of the selected dataset." columns={columns} data={rows} searchPlaceholder="Filter preview rows" />;
}
