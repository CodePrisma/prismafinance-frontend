import React from "react";
import "./GridRegistros.css";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";

const GridRegistros = ({ registros, onEdit, onDelete, chaveId = "ID", exibirEditar = true, exibirDeletar = true, ocultarCampos = [] }) => {
  if (!registros || registros.length === 0) return <p>Nenhum registro encontrado.</p>;

  const colunas = Object.keys(registros[0]).filter((col) => !ocultarCampos.includes(col));

  return (
    <div className="grid-container">
      <table className="grid-table">
        <thead>
          <tr>
            {colunas.map((col) => (
              <th key={col}>{col}</th>
            ))}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((registro) => (
            <tr key={registro[chaveId]}>
              {colunas.map((col) => (
                <td key={col}>{registro[col]}</td>
              ))}
              <td className="acoes">
                {exibirEditar && (
                  <FaEdit
                    className="icon edit-icon"
                    onClick={() => onEdit(registro)}
                    title="Editar"
                  />
                )}
                {exibirDeletar && (
                  <FaTrash
                    className="icon delete-icon"
                    onClick={async () => {
                      const result = await Swal.fire({
                        title: "Tem certeza?",
                        text: "Você deseja excluir este registro?",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sim, excluir",
                        cancelButtonText: "Cancelar",
                        cancelButtonColor: "var(--color-btnCancelar-danger)",
                        customClass: {
                          cancelButton: "swal-cancel-danger",
                        },
                      });

                      if (!result.isConfirmed) return;

                      onDelete(registro[chaveId]);
                    }}
                    title="Excluir"
                  />

                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GridRegistros;
