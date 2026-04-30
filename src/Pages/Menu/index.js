/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { FaBell, FaBolt, FaCalendarAlt, FaCoins, FaPlus, FaSearch } from "react-icons/fa";
import { FiArrowDownRight, FiArrowUpRight, FiClock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import MenuLateral from "../../Componentes/MenuLateral";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { useOperador } from "../../Hooks/useOperador";
import { currentCompetencia, formatCurrency, formatDateDisplay, formatDateInput, monthName } from "../../utils/formatters";
import "./styles.css";

const Sparkline = ({ color = "currentColor", trend = "up" }) => {
  const points = trend === "up" ? "2,38 18,32 34,35 48,24 62,19 76,8 94,14 112,4" : "2,12 18,16 34,20 48,18 62,25 78,30 94,34 112,38";
  return <svg className="sparkline" viewBox="0 0 116 44" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

const getAcaoData = (acao) =>
  acao.data_previsao ||
  acao.data_prazo ||
  acao.dataprevisao ||
  acao.dataprazo ||
  acao.data;

const getQuadroId = (quadro) => quadro?.idquadroacao || quadro?.IDquadroacao || quadro?.id;
const getSituacaoOrdem = (situacao) => Number(situacao?.ordem || 9999);

const getAcaoDateTime = (acao) => {
  const dataAcao = getAcaoData(acao);
  if (!dataAcao) return Number.MAX_SAFE_INTEGER;

  const time = new Date(dataAcao).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const ordenarAcoesPorData = (acoes) =>
  [...(acoes || [])].sort((a, b) => {
    const dataDiff = getAcaoDateTime(a) - getAcaoDateTime(b);
    if (dataDiff !== 0) return dataDiff;

    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getCardValue = (cards, keys) => {
  const key = keys.find((field) => cards?.[field] !== undefined && cards?.[field] !== null);
  return key ? toNumber(cards[key]) : 0;
};

const calcularKpisFinanceiros = (lancamentosCompetencia = [], lancamentosFuturos = [], cards = {}) => {
  if (!lancamentosCompetencia.length && !lancamentosFuturos.length) {
    return {
      receitasConfirmadas: getCardValue(cards, ["receitas_confirmadas", "receitas_operacionais_confirmadas", "receitas_operacionais"]),
      despesasConfirmadas: getCardValue(cards, ["despesas_confirmadas", "despesas_operacionais_confirmadas", "despesas_operacionais"]),
      receitasFuturas: getCardValue(cards, ["receitas_futuras", "receita_futura", "receitas_operacionais_futuras"]),
      despesasFuturas: getCardValue(cards, ["despesas_futuras", "despesa_futura", "despesas_operacionais_futuras"]),
    };
  }

  const totaisCompetencia = lancamentosCompetencia.reduce((totais, lancamento) => {
    const status = Number(lancamento.status);
    const tipo = Number(lancamento.tipo);
    const valor = toNumber(lancamento.valor);

    if (status === 2 && tipo === 1) totais.receitasConfirmadas += valor;
    if (status === 2 && tipo === 2) totais.despesasConfirmadas += valor;

    return totais;
  }, {
    receitasConfirmadas: 0,
    despesasConfirmadas: 0,
  });

  const totaisFuturos = lancamentosFuturos.reduce((totais, lancamento) => {
    const status = Number(lancamento.status);
    const tipo = Number(lancamento.tipo);
    const valor = toNumber(lancamento.valor);

    if (status === 1 && tipo === 1) totais.receitasFuturas += valor;
    if (status === 1 && tipo === 2) totais.despesasFuturas += valor;

    return totais;
  }, {
    receitasFuturas: 0,
    despesasFuturas: 0,
  });

  return {
    ...totaisCompetencia,
    ...totaisFuturos,
  };
};

const Menu = () => {
  const navigate = useNavigate();
  const { isAuthenticated, authReady, clienteAtivo } = useAuthContext();
  const { nome, operador } = useOperador();
  const competencia = currentCompetencia();
  const [dashboard, setDashboard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [quick, setQuick] = useState({ tipo: 1, descricao: "", valor: "", IDcontabancaria: "", IDcatfinanceira: "" });

  useEffect(() => {
    if (authReady && (!isAuthenticated || !operador)) navigate("/");
  }, [authReady, isAuthenticated, navigate, operador]);

  const carregarDashboard = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const [dashResponse, contasResponse, categoriasResponse] = await Promise.all([
      api.get(`/clientes/${clienteAtivo.IDcliente}/dashboard?ano=${competencia.ano}&mes=${competencia.mes}`),
      api.get(`/clientes/${clienteAtivo.IDcliente}/contas-bancarias`).catch(() => ({ data: [] })),
      api.get(`/clientes/${clienteAtivo.IDcliente}/categorias-financeiras`).catch(() => ({ data: [] })),
    ]);

    const quadrosResponse = await api.get(`/clientes/${clienteAtivo.IDcliente}/quadros-acao`).catch(() => ({ data: [] }));
    const primeiroQuadro = (quadrosResponse.data || [])[0];
    const quadroId = getQuadroId(primeiroQuadro);
    const kanbanResponse = quadroId
      ? await api.get(`/quadros-acao/${quadroId}/kanban`).catch(() => ({ data: null }))
      : { data: null };
    const [lancamentosResponse, lancamentosFuturosResponse] = await Promise.all([
      api
      .get(`/clientes/${clienteAtivo.IDcliente}/lancamentos?ano=${competencia.ano}&mes=${competencia.mes}`)
      .catch(() => ({ data: [] })),
      api
        .get(`/clientes/${clienteAtivo.IDcliente}/lancamentos?status=1`)
        .catch(() => ({ data: [] })),
    ]);
    const primeiraSituacao = (kanbanResponse.data?.situacoes || [])
      .sort((a, b) => getSituacaoOrdem(a) - getSituacaoOrdem(b))[0];
    const cards = dashResponse.data?.cards || {};

    setDashboard({
      ...dashResponse.data,
      kpisFinanceiros: calcularKpisFinanceiros(lancamentosResponse.data || [], lancamentosFuturosResponse.data || [], cards),
      acoes: ordenarAcoesPorData(primeiraSituacao?.acoes || []),
    });
    setContas(contasResponse.data || []);
    setCategorias(categoriasResponse.data || []);
  };

  useEffect(() => {
    carregarDashboard().catch(() => {
      if (clienteAtivo?.IDcliente) Swal.fire("Erro", "Nao foi possivel carregar o dashboard.", "error");
    });
  }, [clienteAtivo]);

  const salvarRapido = async (event) => {
    event.preventDefault();
    if (!quick.descricao || !quick.valor || !quick.IDcontabancaria || !quick.IDcatfinanceira) {
      Swal.fire("Campos obrigatorios", "Preencha conta, categoria, descricao e valor.", "warning");
      return;
    }

    try {
      await api.post(`/clientes/${clienteAtivo.IDcliente}/lancamentos`, {
        IDcontabancaria: Number(quick.IDcontabancaria),
        IDcatfinanceira: Number(quick.IDcatfinanceira),
        descricao: quick.descricao,
        tipo: Number(quick.tipo),
        valor: Number(quick.valor),
        obs: null,
        data_lancamento: formatDateInput(),
        data_vencimento: formatDateInput(),
        data_baixa: formatDateInput(),
        status: 2,
        competencia_ano: competencia.ano,
        competencia_mes: competencia.mes,
      });
      setModalOpen(false);
      setQuick({ tipo: 1, descricao: "", valor: "", IDcontabancaria: "", IDcatfinanceira: "" });
      await carregarDashboard();
      Swal.fire("Lancamento salvo", "Lancamento rapido registrado.", "success");
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel salvar o lancamento rapido.", "error");
    }
  };

  const cards = dashboard?.cards || {};
  const kpisFinanceiros = dashboard?.kpisFinanceiros || calcularKpisFinanceiros([], [], cards);
  const dreItems = dashboard?.dre?.grupos || [];
  const acoes = dashboard?.acoes || [];
  const categoriasFiltradas = categorias.filter((cat) => Number(cat.tipo) === Number(quick.tipo));

  return (
    <div className="menu-container-menu">
      <MenuLateral />
      <main id="painel_principal_menu" align="center">
        <div className="dashboard-shell">
          <div className="dashboard-topbar">
            <label className="dashboard-search"><FaSearch /><input type="search" placeholder="Buscar no sistema" /></label>
            <div className="dashboard-welcome">
              <span>Bem-vindo de volta</span><strong>{nome || "Operador"}</strong>
              <button type="button" aria-label="Notificacoes"><FaBell /></button>
            </div>
          </div>

          {!clienteAtivo ? (
            <section className="empty-state-card">
              <strong>Escolha um cliente para abrir o painel</strong>
              <span>Depois da escolha, o dashboard, saldos, DRE e ações passam a usar o mesmo contexto.</span>
            </section>
          ) : (
            <section className="dashboard-grid">
              <div className="dashboard-main">
                <header className="dashboard-title">
                  <span>Dashboard executivo</span>
                  <h1>{clienteAtivo.nome}</h1>
                </header>

                <div className="quick-actions-bar">
                  <button className="action-button" onClick={() => setModalOpen(true)}><FaBolt /> Lancamento rapido</button>
                  <button className="secondary-button" onClick={() => navigate("/Lancamentos")}><FaPlus /> Lancamentos completos</button>
                </div>

                <div className="kpi-grid">
                  <article className="finance-card receita"><div><span className="finance-card__icon"><FiArrowUpRight /></span><p>Receitas Operacionais</p><small>Apenas o que ja entrou no caixa</small><strong>{formatCurrency(kpisFinanceiros.receitasConfirmadas)}</strong></div><Sparkline color="var(--color-success)" /></article>
                  <article className="finance-card despesa"><div><span className="finance-card__icon"><FiArrowDownRight /></span><p>Despesas Operacionais</p><small>Apenas o que ja saiu do caixa</small><strong>{formatCurrency(kpisFinanceiros.despesasConfirmadas)}</strong></div><Sparkline color="#df7c5f" trend="down" /></article>
                  <article className="finance-card receita-futura"><div><span className="finance-card__icon"><FiClock /></span><p>Receitas Futuras</p><small>Lancada, mas nao confirmada</small><strong>{formatCurrency(kpisFinanceiros.receitasFuturas)}</strong></div><Sparkline color="#d9b661" /></article>
                  <article className="finance-card despesa-futura"><div><span className="finance-card__icon"><FiClock /></span><p>Despesas Futuras</p><small>Lancada, mas nao confirmada</small><strong>{formatCurrency(kpisFinanceiros.despesasFuturas)}</strong></div><Sparkline color="#c98f72" trend="down" /></article>
                </div>

                <article className="monthly-card">
                  <div className="monthly-card__header"><div><FaCoins /><span>Visao Geral: {monthName(competencia.mes)} de {competencia.ano}</span></div><strong>{formatCurrency(cards.lucro_liquido)}</strong></div>
                  <div className="bank-balance-grid">
                    {(dashboard?.saldos || []).map((saldo) => <article key={saldo.IDcontabancaria}><span>{saldo.nomebanco}</span><strong>{formatCurrency(saldo.saldo_atual)}</strong></article>)}
                  </div>
                </article>

                <section className="tasks-section">
                  <h2>Ações recentes</h2>
                  <div className="kanban-grid dashboard-actions-grid">
                    {acoes.length ? acoes.slice(0, 6).map((acao, index) => {
                      const dataAcao = getAcaoData(acao);
                      return <div key={acao.id || index} className="task-card"><strong>{acao.titulo || acao.descricao || "Acao"}</strong><span><FaCalendarAlt />{dataAcao ? formatDateDisplay(dataAcao) : "Sem data"}</span></div>;
                    }) : <section className="empty-state-card"><strong>Nenhuma acao no dashboard</strong><span>Use a tela Ações para acompanhar o quadro do cliente.</span></section>}
                  </div>
                </section>
              </div>

              <aside className="dre-panel">
                <header><div><span>DRE</span><strong>{clienteAtivo.nome}</strong></div><b>{competencia.ano}</b></header>
                {dreItems.length ? dreItems.map((item) => <article key={item.IDgrupoDRE || item.nome} className={`dre-line ${Number(item.total) >= 0 ? "dre-line--success" : "dre-line--danger"}`}><div><span>{item.nome}</span><strong>{formatCurrency(item.total)}</strong></div><Sparkline color={Number(item.total) >= 0 ? "var(--color-success)" : "#df7c5f"} trend={Number(item.total) >= 0 ? "up" : "down"} /></article>) : <p className="muted-text">Sem grupos para a competencia.</p>}
                <footer className="dre-total"><div><span>Lucro Liquido</span><strong>{formatCurrency(dashboard?.dre?.lucro_liquido || cards.lucro_liquido)}</strong></div><div className="dre-progress"><span></span></div><small>Provisoes hoje <b>{cards.provisoes_hoje || 0}</b></small></footer>
              </aside>
            </section>
          )}
        </div>

        {modalOpen && (
          <div className="quick-modal-backdrop">
            <form className="quick-modal" onSubmit={salvarRapido}>
              <header><strong>Lancamento rapido</strong><button type="button" onClick={() => setModalOpen(false)}>x</button></header>
              <label>Tipo<select value={quick.tipo} onChange={(e) => setQuick((q) => ({ ...q, tipo: e.target.value, IDcatfinanceira: "" }))}><option value={1}>Credito</option><option value={2}>Debito</option></select></label>
              <label>Conta<select value={quick.IDcontabancaria} onChange={(e) => setQuick((q) => ({ ...q, IDcontabancaria: e.target.value }))}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.IDcontabancaria} value={conta.IDcontabancaria}>{conta.nomebanco}</option>)}</select></label>
              <label>Categoria<select value={quick.IDcatfinanceira} onChange={(e) => setQuick((q) => ({ ...q, IDcatfinanceira: e.target.value }))}><option value="">Selecione</option>{categoriasFiltradas.map((cat) => <option key={cat.IDcatfinanceira} value={cat.IDcatfinanceira}>{cat.nome}</option>)}</select></label>
              <label>Descricao<input value={quick.descricao} onChange={(e) => setQuick((q) => ({ ...q, descricao: e.target.value }))} /></label>
              <label>Valor<input type="number" step="0.01" value={quick.valor} onChange={(e) => setQuick((q) => ({ ...q, valor: e.target.value }))} /></label>
              <button className="action-button">Salvar rapido</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Menu;
