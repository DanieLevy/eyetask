"use client"

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  title?: string
  subtitle?: string
  searchKey?: string
  searchPlaceholder?: string
  showColumnToggle?: boolean
  showPagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  dir?: "rtl" | "ltr"
  className?: string
  emptyState?: React.ReactNode
  headerActions?: React.ReactNode
  fullWidth?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  subtitle,
  searchKey,
  searchPlaceholder = "חיפוש...",
  showColumnToggle = true,
  showPagination = true,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  dir = "rtl",
  className,
  emptyState,
  headerActions,
  fullWidth = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [searchValue, setSearchValue] = React.useState("")
  const [rowSelection, setRowSelection] = React.useState({})

  // Apply the search filter when searchValue changes
  React.useEffect(() => {
    if (searchKey && searchValue) {
      setColumnFilters([
        {
          id: searchKey,
          value: searchValue,
        }
      ])
    } else {
      setColumnFilters([])
    }
  }, [searchKey, searchValue])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  return (
    <Card className={cn("border", className)} dir={dir}>
      {(title || subtitle || searchKey || showColumnToggle || headerActions) && (
        <CardHeader className="px-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {searchKey && (
                <div className="relative w-full sm:w-64 flex-1">
                  <Search className={cn(
                    "absolute top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4",
                    dir === "rtl" ? "right-3" : "left-3"
                  )} />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className={cn(
                      "pl-9 pr-9",
                      dir === "rtl" && "text-right pr-9 pl-9"
                    )}
                  />
                  {searchValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "absolute top-1/2 transform -translate-y-1/2 p-0 h-4 w-4",
                        dir === "rtl" ? "left-3" : "right-3"
                      )}
                      onClick={() => setSearchValue("")}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">נקה חיפוש</span>
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                {showColumnToggle && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-auto flex gap-1 items-center">
                        <Filter className="h-3.5 w-3.5" />
                        <span>עמודות</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={dir === "rtl" ? "end" : "start"}>
                      {table
                        .getAllColumns()
                        .filter(
                          (column) =>
                            typeof column.accessorFn !== "undefined" &&
                            column.getCanHide()
                        )
                        .map((column) => {
                          return (
                            <DropdownMenuCheckboxItem
                              key={column.id}
                              className="capitalize"
                              checked={column.getIsVisible()}
                              onCheckedChange={(value) =>
                                column.toggleVisibility(!!value)
                              }
                            >
                              {column.id}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {headerActions}
              </div>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("p-0", !fullWidth && "overflow-auto")}>
        <div className={cn("rounded-md", fullWidth && "overflow-auto")}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} style={{ textAlign: dir === "rtl" ? "right" : "left" }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id}
                        style={{ 
                          textAlign: dir === "rtl" ? "right" : "left",
                          whiteSpace: "normal",
                          wordBreak: "break-word" 
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyState || (
                      <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
                        <p className="text-muted-foreground">לא נמצאו נתונים</p>
                        {searchValue && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSearchValue("")}
                            className="mt-2"
                          >
                            נקה חיפוש
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {showPagination && (
        <div className="flex items-center justify-between space-x-6 space-x-reverse p-4 border-t">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <div>
                {table.getFilteredSelectedRowModel().rows.length} מתוך{" "}
                {table.getFilteredRowModel().rows.length} שורות נבחרו.
              </div>
            )}
          </div>
          <div className="flex items-center space-x-6 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium">שורות לעמוד</p>
              <select
                className="h-8 w-16 rounded-md border border-input bg-background px-2"
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                }}
              >
                {pageSizeOptions.map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              עמוד {table.getState().pagination.pageIndex + 1} מתוך{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">עמוד ראשון</span>
                <ChevronRight className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">עמוד קודם</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">עמוד הבא</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">עמוד אחרון</span>
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
} 