import type { DataGridMessages } from "./DataGrid.types";

export const dataGridMessagesEs: DataGridMessages = {
  emptyTitle: "Sin registros",
  noResults: "Sin resultados para los filtros aplicados",
  columns: "Columnas",
  filterLabel: (header) => `Filtrar ${header}`,
  sortLabel: (header) => `Ordenar por ${header}`,
  selectAll: "Seleccionar todas las filas de la página",
  selectRow: "Seleccionar fila",
  pageOf: (page, total) => `Página ${page} de ${total}`,
  range: (first, last, total) => `Mostrando ${first} al ${last} de ${total} registros`,
  rowsPerPage: "Filas por página",
  firstPage: "Primera página",
  previousPage: "Página anterior",
  nextPage: "Página siguiente",
  lastPage: "Última página",
  loading: "Cargando…",
  yes: "Sí",
  no: "No",
  addRow: "Agregar",
};
