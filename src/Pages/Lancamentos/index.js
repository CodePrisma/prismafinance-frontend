/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { currentCompetencia, formatCurrency, formatDateInput } from "../../utils/formatters";

const competencia = currentCompetencia();
const getInitialForm = () => ({
  IDcontabancaria: "",
  IDcatfinanceira: "",
  descricao: "",
  tipo: 1,
  valor: "",
  obs: "",
  data_lancamento: formatDateInput(),
  data_vencimento: formatDateInput(),
  data_baixa: formatDateInput(),
  status: 2,
  competencia_ano: competencia.ano,
  competencia_mes: competencia.mes,
});

const getLancamentoId = (row) =>
  row.IDfinanceiro ||
  row.idfinanceiro ||
  row.IDlancamento ||
  row.IDLancamento ||
  row.idlancamento ||
  row.id;
const statusLabel = (status) => ({ 1: "Em aberto", 2: "Pago/recebido", 3: "Cancelado" }[Number(status)] || status);
const getDateTime = (date) => {
  if (!date) return Number.MAX_SAFE_INTEGER;

  const time = new Date(date).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const ordenarPorVencimento = (items) =>
  [...(items || [])].sort((a, b) => {
    const vencimentoDiff = getDateTime(a.data_vencimento) - getDateTime(b.data_vencimento);
    if (vencimentoDiff !== 0) return vencimentoDiff;

    return getDateTime(a.data_lancamento) - getDateTime(b.data_lancamento);
  });

const getDateInputValue = (date) => {
  if (!date) return formatDateInput();

  const isoDate = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

  const brDate = String(date).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return `${brDate[3]}-${brDate[2]}-${brDate[1]}`;

  return formatDateInput(date);
};

const parseInputDate = (date) => {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const addMonthsKeepingDay = (date, monthsToAdd) => {
  const base = parseInputDate(date);
  const targetYear = base.getFullYear();
  const targetMonth = base.getMonth() + monthsToAdd;
  const targetDay = base.getDate();
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  return new Date(targetYear, targetMonth, Math.min(targetDay, lastDayOfTargetMonth));
};

const getCompetenciaFromDate = (date) => {
  const parsed = parseInputDate(date);

  return {
    ano: parsed.getFullYear(),
    mes: parsed.getMonth() + 1,
  };
};

const Lancamentos = () => {
  const { clienteAtivo } = useAuthContext();
  const [form, setForm] = useState(getInitialForm);
  const [parcelamento, setParcelamento] = useState({ ativo: false, quantidade: 2 });
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [provisoesHoje, setProvisoesHoje] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [filtros, setFiltros] = useState({ ano: competencia.ano, mes: competencia.mes, status: "" });
  const [editingId, setEditingId] = useState(null);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const carregarBase = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const [contasResponse, categoriasResponse, saldosResponse] = await Promise.all([
      api.get(`/clientes/${clienteAtivo.IDcliente}/contas-bancarias`),
      api.get(`/clientes/${clienteAtivo.IDcliente}/categorias-financeiras`),
      api.get(`/clientes/${clienteAtivo.IDcliente}/saldos-bancarios`).catch(() => ({ data: [] })),
    ]);
    setContas(contasResponse.data || []);
    setCategorias(categoriasResponse.data || []);
    setSaldos(saldosResponse.data || []);
  };

  const carregarLancamentos = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const params = new URLSearchParams();
    if (filtros.ano) params.set("ano", filtros.ano);
    if (filtros.mes) params.set("mes", filtros.mes);
    if (filtros.status) params.set("status", filtros.status);

    const [lancResponse, provisoesResponse] = await Promise.all([
      api.get(`/clientes/${clienteAtivo.IDcliente}/lancamentos?${params.toString()}`),
      api.get(`/clientes/${clienteAtivo.IDcliente}/provisoes/vencendo-hoje`).catch(() => ({ data: [] })),
    ]);
    setLancamentos(ordenarPorVencimento(lancResponse.data));
    setProvisoesHoje(provisoesResponse.data || []);
  };

  useEffect(() => {
    carregarBase().catch(() => Swal.fire("Erro", "Nao foi possivel carregar dados de apoio.", "error"));
  }, [clienteAtivo]);

  useEffect(() => {
    carregarLancamentos().catch(() => Swal.fire("Erro", "Nao foi possivel carregar lancamentos.", "error"));
  }, [clienteAtivo, filtros]);

  const categoriasFiltradas = useMemo(() => categorias.filter((cat) => Number(cat.tipo) === Number(form.tipo)), [categorias, form.tipo]);

  const criarPayload = (dadosForm) => ({
      ...dadosForm,
      IDcontabancaria: Number(dadosForm.IDcontabancaria),
      IDcatfinanceira: Number(dadosForm.IDcatfinanceira),
      tipo: Number(dadosForm.tipo),
      valor: Number(dadosForm.valor),
      status: Number(dadosForm.status),
      data_baixa: Number(dadosForm.status) === 2 ? dadosForm.data_baixa || dadosForm.data_lancamento : null,
      competencia_ano: Number(dadosForm.competencia_ano),
      competencia_mes: Number(dadosForm.competencia_mes),
  });

  const criarParcelas = () => {
    const quantidade = Math.max(1, Number(parcelamento.quantidade || 1));

    return Array.from({ length: quantidade }, (_, index) => {
      const dataParcela = formatDateInput(addMonthsKeepingDay(form.data_lancamento, index));
      const competenciaParcela = getCompetenciaFromDate(dataParcela);

      return criarPayload({
        ...form,
        descricao: quantidade > 1 ? `${form.descricao} (${index + 1}/${quantidade})` : form.descricao,
        data_lancamento: dataParcela,
        data_vencimento: dataParcela,
        data_baixa: Number(form.status) === 2 ? dataParcela : null,
        competencia_ano: competenciaParcela.ano,
        competencia_mes: competenciaParcela.mes,
      });
    });
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!form.IDcontabancaria || !form.IDcatfinanceira || !form.descricao || !form.valor) {
      Swal.fire("Campos obrigatorios", "Informe conta, categoria, descricao e valor.", "warning");
      return;
    }

    if (!editingId && parcelamento.ativo && Number(parcelamento.quantidade) < 2) {
      Swal.fire("Parcelas invalidas", "Informe pelo menos 2 parcelas.", "warning");
      return;
    }

    const payload = criarPayload(form);

    try {
      if (editingId) {
        await api.put(`/lancamentos/${editingId}`, payload);
        Swal.fire("Lançamento atualizado", "Lançamento atualizado com sucesso.", "success");
      } else if (parcelamento.ativo) {
        const parcelas = criarParcelas();
        await Promise.all(parcelas.map((parcela) => api.post(`/clientes/${clienteAtivo.IDcliente}/lancamentos`, parcela)));
        Swal.fire("Parcelas criadas", `${parcelas.length} parcelas de ${formatCurrency(form.valor)} foram cadastradas.`, "success");
      } else {
        await api.post(`/clientes/${clienteAtivo.IDcliente}/lancamentos`, payload);
        Swal.fire("Lançamento salvo", Number(form.status) === 1 ? "Provisão cadastrada." : "Lançamento confirmado.", "success");
      }
      setEditingId(null);
      setForm(getInitialForm());
      setParcelamento({ ativo: false, quantidade: 2 });
      await carregarLancamentos();
      await carregarBase();
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel salvar o lançamento.", "error");
    }
  };

  const editar = (row) => {
    setEditingId(getLancamentoId(row));
    setForm({
      IDcontabancaria: row.IDcontabancaria || row.idcontabancaria || "",
      IDcatfinanceira: row.IDcatfinanceira || row.idcatfinanceira || "",
      descricao: row.descricao || "",
      tipo: Number(row.tipo || 1),
      valor: String(row.valor || ""),
      obs: row.obs || "",
      data_lancamento: getDateInputValue(row.data_lancamento),
      data_vencimento: getDateInputValue(row.data_vencimento),
      data_baixa: getDateInputValue(row.data_baixa),
      status: Number(row.status || 1),
      competencia_ano: row.competencia_ano || filtros.ano || competencia.ano,
      competencia_mes: row.competencia_mes || filtros.mes || competencia.mes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limparEdicao = () => {
    setEditingId(null);
    setForm(getInitialForm());
    setParcelamento({ ativo: false, quantidade: 2 });
  };

  const confirmar = async (row) => {
    const id = getLancamentoId(row);
    try {
      await api.patch(`/provisoes/${id}/confirmar`, {
        IDcontabancaria: row.IDcontabancaria,
        IDcatfinanceira: row.IDcatfinanceira,
        data_baixa: formatDateInput(),
      });
      await carregarLancamentos();
      await carregarBase();
      Swal.fire("Confirmado", "Provisão baixada com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", "Não foi possivel confirmar a provisão.", "error");
    }
  };

  const cancelar = async (row) => {
    const id = getLancamentoId(row);
    try {
      await api.patch(`/lancamentos/${id}/cancelar`);
      await carregarLancamentos();
      Swal.fire("Cancelado", "Lançamento cancelado.", "success");
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel cancelar.", "error");
    }
  };

  return (
    <PageLayout title="Lançamentos financeiros" eyebrow="Financeiro" subtitle="Cadastre despesas, creditos e provisoes futuras. No vencimento, confirme a baixa pela lista de provisoes.">
      <div className="metrics-grid">
        {saldos.map((saldo) => <article className="metric-card" key={saldo.IDcontabancaria}><span>{saldo.nomebanco}</span><strong>{formatCurrency(saldo.saldo_atual)}</strong></article>)}
      </div>

      {!!provisoesHoje.length && (
        <section className="empty-state-card">
          <strong>{provisoesHoje.length} provisao(oes) vencendo hoje</strong>
          <span>Confirme pagamento/recebimento para atualizar o saldo bancario.</span>
        </section>
      )}

      <form className="crud-card" onSubmit={salvar}>
        {editingId && (
          <div className="form-edit-toolbar">
            <span>Editando lançamento selecionado</span>
            <button type="button" className="secondary-button" onClick={limparEdicao}>Cancelar edicao</button>
          </div>
        )}

        <div className="form-grid">
          <label className="form-field span-3"><span>Tipo</span><select value={form.tipo} onChange={(e) => updateField("tipo", e.target.value)}><option value={1}>Credito / Receita</option><option value={2}>Debito / Despesa</option></select></label>
          <label className="form-field span-3"><span>Status</span><select value={form.status} onChange={(e) => updateField("status", e.target.value)}><option value={1}>Provisao futura</option><option value={2}>Pago / recebido</option>{editingId && <option value={3}>Cancelado</option>}</select></label>
          <label className="form-field span-3"><span>Conta bancaria</span><select value={form.IDcontabancaria} onChange={(e) => updateField("IDcontabancaria", e.target.value)}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.IDcontabancaria} value={conta.IDcontabancaria}>{conta.nomebanco} - {conta.contacorrente}</option>)}</select></label>
          <label className="form-field span-3"><span>Categoria</span><select value={form.IDcatfinanceira} onChange={(e) => updateField("IDcatfinanceira", e.target.value)}><option value="">Selecione</option>{categoriasFiltradas.map((cat) => <option key={cat.IDcatfinanceira} value={cat.IDcatfinanceira}>{cat.nome}</option>)}</select></label>
          <label className="form-field span-6"><span>Descricao</span><input value={form.descricao} onChange={(e) => updateField("descricao", e.target.value)} /></label>
          <label className="form-field span-2"><span>Valor</span><input type="number" step="0.01" value={form.valor} onChange={(e) => updateField("valor", e.target.value)} /></label>
          <label className="form-field span-2"><span>Lancamento</span><input type="date" value={form.data_lancamento} onChange={(e) => updateField("data_lancamento", e.target.value)} /></label>
          <label className="form-field span-2"><span>Vencimento</span><input type="date" value={form.data_vencimento} onChange={(e) => updateField("data_vencimento", e.target.value)} /></label>
          <label className="form-field span-2"><span>Ano</span><input type="number" value={form.competencia_ano} onChange={(e) => updateField("competencia_ano", e.target.value)} /></label>
          <label className="form-field span-2"><span>Mes</span><input type="number" min="1" max="12" value={form.competencia_mes} onChange={(e) => updateField("competencia_mes", e.target.value)} /></label>
          <label className="form-field span-8"><span>Observacao</span><input value={form.obs} onChange={(e) => updateField("obs", e.target.value)} /></label>
          {!editingId && (
            <>
              <label className="form-field span-3"><span>Parcelar</span><select value={parcelamento.ativo ? "1" : "0"} onChange={(e) => setParcelamento((current) => ({ ...current, ativo: e.target.value === "1" }))}><option value="0">Nao</option><option value="1">Sim</option></select></label>
              {parcelamento.ativo && <label className="form-field span-3"><span>Quantidade de parcelas</span><input type="number" min="2" value={parcelamento.quantidade} onChange={(e) => setParcelamento((current) => ({ ...current, quantidade: e.target.value }))} /></label>}
            </>
          )}
        </div>
        <div className="form-footer">
          {editingId && <button type="button" className="secondary-button" onClick={limparEdicao}>Cancelar edicao</button>}
          <button className="action-button">{editingId ? "Atualizar lancamento" : "Salvar lancamento"}</button>
        </div>
      </form>

      <section className="filter-card">
        <div className="filter-row">
          <label>Ano <input type="number" value={filtros.ano} onChange={(e) => setFiltros((f) => ({ ...f, ano: e.target.value }))} /></label>
          <label>Mes <input type="number" min="1" max="12" value={filtros.mes} onChange={(e) => setFiltros((f) => ({ ...f, mes: e.target.value }))} /></label>
          <label>Status <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}><option value="">Todos</option><option value={1}>Em aberto</option><option value={2}>Pago/recebido</option><option value={3}>Cancelado</option></select></label>
        </div>
      </section>

      <DataTable
        data={lancamentos}
        columns={[
          { header: "Descricao", render: (row) => <strong>{row.descricao}</strong> },
          { header: "Tipo", render: (row) => Number(row.tipo) === 1 ? <span className="badge-soft badge-success">Credito</span> : <span className="badge-soft badge-danger">Debito</span> },
          { header: "Valor", render: (row) => formatCurrency(row.valor) },
          { header: "Vencimento", key: "data_vencimento" },
          { header: "Status", render: (row) => <span className="badge-soft">{statusLabel(row.status)}</span> },
          { header: "Acoes", render: (row) => <div className="row-actions"><button className="secondary-button" onClick={() => editar(row)}>Editar</button>{Number(row.status) === 1 && <button className="action-button" onClick={() => confirmar(row)}>Confirmar</button>} {Number(row.status) !== 3 && <button className="danger-button" onClick={() => cancelar(row)}>Cancelar</button>}</div> },
        ]}
      />
    </PageLayout>
  );
};

export default Lancamentos;
