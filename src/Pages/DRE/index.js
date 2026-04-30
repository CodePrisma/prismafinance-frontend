/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { currentCompetencia, formatCurrency, monthName } from "../../utils/formatters";

const DRE = () => {
  const { clienteAtivo } = useAuthContext();
  const competencia = currentCompetencia();
  const [filtros, setFiltros] = useState({ ano: competencia.ano, mes: competencia.mes });
  const [dre, setDre] = useState(null);
  const [anual, setAnual] = useState(null);

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
    carregar().catch(() => Swal.fire("Erro", "Nao foi possivel carregar a DRE.", "error"));
  }, [clienteAtivo, filtros]);

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
          { header: "Grupo", render: (row) => <strong>{row.nome}</strong> },
          { header: "Tipo resultado", key: "tipo_resultado" },
          { header: "Total", render: (row) => <span className={Number(row.total) >= 0 ? "badge-soft badge-success" : "badge-soft badge-danger"}>{formatCurrency(row.total)}</span> },
        ]}
      />

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
