import type { ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  isLoading = false,
}: TableProps<T>) {
  if (isLoading) {
    return <div className="table-state">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="table-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)}>
              {columns.map((col) => (
                <td key={col.header}>{col.accessor(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}