"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="flex shrink-0 items-center justify-between rounded-lg shadow-sm ring-1 ring-foreground/10 bg-white dark:bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Lignes par page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(val) => {
            if (val) {
              onPageSizeChange(Number(val));
              onPageChange(0);
            }
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {totalItems === 0
            ? "0 résultat"
            : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, totalItems)} sur ${totalItems}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <CaretLeft size={14} weight="regular" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            <CaretRight size={14} weight="regular" />
          </Button>
        </div>
      </div>
    </div>
  );
}
