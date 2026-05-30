import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Download, Search } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

type DataTableProps<TData> = {
  title?: string;
  description?: string;
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  onExport?: () => void;
};

export function DataTable<TData>({
  title,
  description,
  columns,
  data,
  searchPlaceholder = "Search table",
  onExport,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    globalFilterFn: "includesString",
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title ? <CardTitle className="text-xl">{title}</CardTitle> : null}
            {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {onExport ? (
              <Button variant="secondary" size="sm" onClick={onExport}>
                <Download aria-hidden="true" />
                Export
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" type="button">
              <ChevronDown aria-hidden="true" />
              Columns
            </Button>
          </div>
        </div>

        <label className="relative max-w-md">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            className="pl-9"
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
          />
        </label>
      </CardHeader>

      <CardContent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-[#E5E7EB] bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="odd:bg-white even:bg-[#FAFBFC]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b border-[#E5E7EB] px-4 py-3 text-sm text-[#111827]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-[#6B7280]" colSpan={columns.length}>
                    No results found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] px-4 py-3 text-sm text-[#6B7280]">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
