import React from "react";
import { formatDateDisplay } from "../../utils/formatters";

const renderCellValue = (column, row, index) => {
  if (column.render) return column.render(row, index);

  const value = row[column.key];
  if (String(column.key || "").toLowerCase().startsWith("data")) {
    return formatDateDisplay(value);
  }

  return value;
};

const DataTable = ({ columns, data, emptyMessage = "Nenhum registro encontrado." }) => (
  <section className="table-card">
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.length ? (
            data.map((row, index) => (
              <tr key={row.id || row.IDfinanceiro || row.IDcliente || row.IDOperador || row.IDcontabancaria || row.IDcatfinanceira || row.idlancamento || index}>
                {columns.map((column) => (
                  <td key={column.key || column.header}>
                    {renderCellValue(column, row, index)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export default DataTable;
