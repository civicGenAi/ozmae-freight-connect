import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  className
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className={cn("flex items-center justify-between px-2 py-4", className)}>
      <div className="flex-1 text-sm text-muted-foreground font-medium">
        Showing <span className="text-foreground font-bold">{startIdx}</span> to <span className="text-foreground font-bold">{endIdx}</span> of <span className="text-foreground font-bold">{totalCount}</span> results
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex w-[100px] items-center justify-center text-sm font-bold text-muted-foreground uppercase tracking-tighter">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-card border shadow-sm hover:text-accent hover:border-accent/40"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-card border shadow-sm hover:text-accent hover:border-accent/40"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Simple dynamic page numbers could go here if needed, but for now standard navigation is cleaner */}
          
          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-card border shadow-sm hover:text-accent hover:border-accent/40"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-card border shadow-sm hover:text-accent hover:border-accent/40"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
