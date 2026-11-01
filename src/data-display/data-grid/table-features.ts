import {
  columnFilteringFeature, columnPinningFeature, columnResizingFeature, columnSizingFeature,
  columnVisibilityFeature, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel,
  rowPaginationFeature, rowSelectionFeature, rowSortingFeature, tableFeatures,
} from "@tanstack/react-table";

export const gridFeatures = tableFeatures({
  columnVisibilityFeature, columnPinningFeature, columnSizingFeature, columnResizingFeature,
  columnFilteringFeature, rowSortingFeature, rowPaginationFeature, rowSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

export type GridFeatures = typeof gridFeatures;
