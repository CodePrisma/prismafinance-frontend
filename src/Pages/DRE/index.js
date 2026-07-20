/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { currentCompetencia, formatCurrency, formatDateDisplay, monthName } from "../../utils/formatters";
import "./styles.css";

const statusLabel = (status) => ({ 1: "Em aberto", 2: "Pago/recebido", 3: "Cancelado" }[Number(status)] || status);

const DRE = () => {
  const { clienteAtivo } = useAuthContext();
  const competencia = currentCompetencia();
  const [filtros, setFiltros] = useState({ ano: competencia.ano, mes: competencia.mes });
  const [dre, setDre] = useState(null);
  const [anual, setAnual] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const carregar = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const params = new URLSearchParams();
    if (filtros.ano) params.set("ano", filtros.ano);
    if (filtros.mes) params.set("mes", filtros.mes);

    const [dreResponse, anualResponse] = await Promise.all([
      api.get(`/clientes/${clienteAtivo.IDcliente}/dre?${params.toString()}`),
      api.get(`/clientes/${clienteAtivo.IDcliente}/dre/anual?ano=${filtros.ano}`).catch(() => ({ data: null })),
    ]);
    setDre(dreResponse.data);
    setAnual(anualResponse.data);
  };

  useEffect(() => {
    setDetalhe(null);
    carregar().catch(() => Swal.fire("Erro", "Nao foi possivel carregar a DRE.", "error"));
  }, [clienteAtivo, filtros]);

  const abrirDetalhe = async (grupo) => {
    setCarregandoDetalhe(true);
    try {
      const response = await api.get(
        `/clientes/${clienteAtivo.IDcliente}/dre/grupos/${grupo.IDgrupoDRE}/lancamentos?ano=${filtros.ano}&mes=${filtros.mes}`
      );
      setDetalhe({ ...response.data, total: grupo.total });
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel carregar os lancamentos do grupo.", "error");
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  return (
    <PageLayout title="DRE" eyebrow="Resultado" subtitle="Demonstrativo por competencia, com grupos de receita, custos, despesas e lucro liquido.">
      <section className="filter-card">
        <div className="filter-row">
          <label>Ano <input type="number" value={filtros.ano} onChange={(e) => setFiltros((f) => ({ ...f, ano: e.target.value }))} /></label>
          <label>Mes <input type="number" min="1" max="12" value={filtros.mes} onChange={(e) => setFiltros((f) => ({ ...f, mes: e.target.value }))} /></label>
        </div>
      </section>

      <div className="metrics-grid">
        <article className="metric-card"><span>Competencia</span><strong>{monthName(filtros.mes)} / {filtros.ano}</strong></article>
        <article className="metric-card"><span>Lucro liquido</span><strong>{formatCurrency(dre?.lucro_liquido)}</strong></article>
        <article className="metric-card"><span>Grupos apurados</span><strong>{dre?.grupos?.length || 0}</strong></article>
        <article className="metric-card"><span>Cliente</span><strong>{clienteAtivo?.nome}</strong></article>
      </div>

      <DataTable
        data={dre?.grupos || []}
        columns={[
          { header: "Ordem", key: "ordem" },
          { header: "Grupo", render: (row) => <button type="button" className="dre-group-button" onClick={() => abrirDetalhe(row)} disabled={carregandoDetalhe}>{row.nome}</button> },
          { header: "Tipo resultado", key: "tipo_resultado" },
          { header: "Total", render: (row) => <span className={Number(row.total) >= 0 ? "badge-soft badge-success" : "badge-soft badge-danger"}>{formatCurrency(row.total)}</span> },
        ]}
      />

      {detalhe && (
        <div className="dre-modal-backdrop" role="presentation" onMouseDown={() => setDetalhe(null)}>
          <section className="dre-modal" role="dialog" aria-modal="true" aria-labelledby="dre-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="dre-modal__header">
              <div>
                <span>Lancamentos da competencia</span>
                <h2 id="dre-detail-title">{detalhe.grupo?.nome}</h2>
                <small>{monthName(detalhe.mes)} / {detalhe.ano}</small>
              </div>
              <button type="button" className="icon-button" onClick={() => setDetalhe(null)} aria-label="Fechar">×</button>
            </header>

            <div className="dre-modal__summary">
              <span>{detalhe.lancamentos?.length || 0} lancamento(s)</span>
              <strong>{formatCurrency(detalhe.total)}</strong>
            </div>

            <div className="data-table-wrap">
              <table className="data-table dre-detail-table">
                <thead><tr><th>Data</th><th>Descricao</th><th>Categoria</th><th>Conta bancaria</th><th>Status</th><th>Valor</th></tr></thead>
                <tbody>
                  {detalhe.lancamentos?.length ? detalhe.lancamentos.map((lancamento) => (
                    <tr key={lancamento.IDfinanceiro}>
                      <td>{formatDateDisplay(lancamento.data_lancamento)}</td>
                      <td><strong>{lancamento.descricao}</strong></td>
                      <td>{lancamento.categoria}</td>
                      <td>{lancamento.conta_bancaria ? `${lancamento.conta_bancaria}${lancamento.contacorrente ? ` - ${lancamento.contacorrente}` : ""}` : "Sem conta"}</td>
                      <td><span className="badge-soft">{statusLabel(lancamento.status)}</span></td>
                      <td className={Number(lancamento.tipo) === 1 ? "dre-value-positive" : "dre-value-negative"}>{formatCurrency((Number(lancamento.tipo) === 1 ? 1 : -1) * Number(lancamento.valor))}</td>
                    </tr>
                  )) : <tr><td colSpan="6">Nenhum lancamento encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <section className="table-card">
        <h2 className="section-title">Visao anual</h2>
        <div className="annual-grid">
          {(anual?.meses || []).map((mes) => (
            <article key={mes.mes} className="annual-card">
              <span>{monthName(mes.mes)}</span>
              <strong>{formatCurrency(mes.lucro_liquido)}</strong>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
};

export default DRE;
