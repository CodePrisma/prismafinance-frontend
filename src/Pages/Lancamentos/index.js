/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { currentCompetencia, formatCurrency, formatDateInput } from "../../utils/formatters";

const competencia = currentCompetencia();
const getInitialFilters = () => {
  const hoje = new Date();
  return {
    conta: "",
    tipo: "",
    categoria: "",
    status: "",
    data_inicio: formatDateInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    data_fim: formatDateInput(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  };
};
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

const getInitialTransferencia = () => ({
  IDconta_origem: "",
  IDconta_destino: "",
  descricao: "Transferencia entre contas",
  valor: "",
  obs: "",
  data_lancamento: formatDateInput(),
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
const isTransferencia = (row) => row.tipo_movimento === "transferencia";
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
  const [modoLancamento, setModoLancamento] = useState("lancamento");
  const [transferencia, setTransferencia] = useState(getInitialTransferencia);
  const [parcelamento, setParcelamento] = useState({ ativo: false, quantidade: 2 });
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [provisoesHoje, setProvisoesHoje] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [filtros, setFiltros] = useState(getInitialFilters);
  const [editingId, setEditingId] = useState(null);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateTransferenciaField = (field, value) => setTransferencia((current) => ({ ...current, [field]: value }));

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
    if (filtros.conta) params.set("conta", filtros.conta);
    if (filtros.tipo === "credito" || filtros.tipo === "debito") {
      params.set("tipo", filtros.tipo === "credito" ? "1" : "2");
      params.set("tipo_movimento", "lancamento");
    }
    if (filtros.tipo === "transferencia") params.set("tipo_movimento", "transferencia");
    if (filtros.categoria) params.set("categoria", filtros.categoria);
    if (filtros.status) params.set("status", filtros.status);
    if (filtros.data_inicio) params.set("data_inicio", filtros.data_inicio);
    if (filtros.data_fim) params.set("data_fim", filtros.data_fim);

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
  const categoriasFiltro = useMemo(() => {
    const tipoCategoria = filtros.tipo === "credito" ? 1 : filtros.tipo === "debito" ? 2 : null;
    return tipoCategoria ? categorias.filter((cat) => Number(cat.tipo) === tipoCategoria) : categorias;
  }, [categorias, filtros.tipo]);

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
    if (!editingId && modoLancamento === "transferencia") {
      if (!transferencia.IDconta_origem || !transferencia.IDconta_destino || !transferencia.valor) {
        Swal.fire("Campos obrigatorios", "Informe conta origem, conta destino e valor.", "warning");
        return;
      }

      if (transferencia.IDconta_origem === transferencia.IDconta_destino) {
        Swal.fire("Contas invalidas", "A conta de origem deve ser diferente da conta de destino.", "warning");
        return;
      }

      const competenciaTransferencia = getCompetenciaFromDate(transferencia.data_lancamento);
      const payload = {
        ...transferencia,
        IDconta_origem: Number(transferencia.IDconta_origem),
        IDconta_destino: Number(transferencia.IDconta_destino),
        valor: Number(transferencia.valor),
        competencia_ano: competenciaTransferencia.ano,
        competencia_mes: competenciaTransferencia.mes,
      };

      try {
        await api.post(`/clientes/${clienteAtivo.IDcliente}/transferencias`, payload);
        Swal.fire("Transferencia salva", "O saldo das duas contas foi atualizado.", "success");
        setTransferencia(getInitialTransferencia());
        await carregarLancamentos();
        await carregarBase();
      } catch (error) {
        Swal.fire("Erro", "Nao foi possivel salvar a transferencia.", "error");
      }
      return;
    }

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
      setModoLancamento("lancamento");
      setParcelamento({ ativo: false, quantidade: 2 });
      await carregarLancamentos();
      await carregarBase();
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel salvar o lançamento.", "error");
    }
  };

  const editar = (row) => {
    if (isTransferencia(row)) {
      Swal.fire("Transferencia", "Transferencias nao podem ser editadas por esta tela. Cancele e lance novamente se precisar corrigir.", "info");
      return;
    }

    setEditingId(getLancamentoId(row));
    setModoLancamento("lancamento");
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
    setModoLancamento("lancamento");
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

        {!editingId && (
          <div className="form-grid">
            <label className="form-field span-3"><span>Operacao</span><select value={modoLancamento} onChange={(e) => setModoLancamento(e.target.value)}><option value="lancamento">Lancamento</option><option value="transferencia">Transferencia entre contas</option></select></label>
          </div>
        )}

        {modoLancamento === "transferencia" && !editingId ? (
          <div className="form-grid">
            <label className="form-field span-3"><span>Conta origem</span><select value={transferencia.IDconta_origem} onChange={(e) => updateTransferenciaField("IDconta_origem", e.target.value)}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.IDcontabancaria} value={conta.IDcontabancaria}>{conta.nomebanco} - {conta.contacorrente}</option>)}</select></label>
            <label className="form-field span-3"><span>Conta destino</span><select value={transferencia.IDconta_destino} onChange={(e) => updateTransferenciaField("IDconta_destino", e.target.value)}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.IDcontabancaria} value={conta.IDcontabancaria}>{conta.nomebanco} - {conta.contacorrente}</option>)}</select></label>
            <label className="form-field span-3"><span>Data</span><input type="date" value={transferencia.data_lancamento} onChange={(e) => updateTransferenciaField("data_lancamento", e.target.value)} /></label>
            <label className="form-field span-3"><span>Valor</span><input type="number" step="0.01" value={transferencia.valor} onChange={(e) => updateTransferenciaField("valor", e.target.value)} /></label>
            <label className="form-field span-6"><span>Descricao</span><input value={transferencia.descricao} onChange={(e) => updateTransferenciaField("descricao", e.target.value)} /></label>
            <label className="form-field span-6"><span>Observacao</span><input value={transferencia.obs} onChange={(e) => updateTransferenciaField("obs", e.target.value)} /></label>
          </div>
        ) : (
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
        )}
        <div className="form-footer">
          {editingId && <button type="button" className="secondary-button" onClick={limparEdicao}>Cancelar edicao</button>}
          <button className="action-button">{editingId ? "Atualizar lancamento" : modoLancamento === "transferencia" ? "Salvar transferencia" : "Salvar lancamento"}</button>
        </div>
      </form>

      <section className="filter-card">
        <div className="filter-row">
          <label>Conta bancaria <select value={filtros.conta} onChange={(e) => setFiltros((f) => ({ ...f, conta: e.target.value }))}><option value="">Todas</option>{contas.map((conta) => <option key={conta.IDcontabancaria} value={conta.IDcontabancaria}>{conta.nomebanco} - {conta.contacorrente}</option>)}</select></label>
          <label>Tipo <select value={filtros.tipo} onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value, categoria: "" }))}><option value="">Todos</option><option value="credito">Credito / Receita</option><option value="debito">Debito / Despesa</option><option value="transferencia">Transferencia</option></select></label>
          <label>Categoria <select value={filtros.categoria} disabled={filtros.tipo === "transferencia"} onChange={(e) => setFiltros((f) => ({ ...f, categoria: e.target.value }))}><option value="">{filtros.tipo === "transferencia" ? "Nao se aplica" : "Todas"}</option>{filtros.tipo !== "transferencia" && categoriasFiltro.map((categoria) => <option key={categoria.IDcatfinanceira} value={categoria.IDcatfinanceira}>{categoria.nome}</option>)}</select></label>
          <label>Data inicial <input type="date" value={filtros.data_inicio} onChange={(e) => setFiltros((f) => ({ ...f, data_inicio: e.target.value }))} /></label>
          <label>Data final <input type="date" value={filtros.data_fim} onChange={(e) => setFiltros((f) => ({ ...f, data_fim: e.target.value }))} /></label>
          <label>Status <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}><option value="">Todos</option><option value={1}>Em aberto</option><option value={2}>Pago/recebido</option><option value={3}>Cancelado</option></select></label>
          <button type="button" className="secondary-button" onClick={() => setFiltros(getInitialFilters())}>Restaurar periodo</button>
        </div>
      </section>

      <DataTable
        data={lancamentos}
        columns={[
          { header: "Descricao", render: (row) => <strong>{row.descricao}</strong> },
          { header: "Tipo", render: (row) => isTransferencia(row) ? <span className="badge-soft badge-warning">Transferencia</span> : Number(row.tipo) === 1 ? <span className="badge-soft badge-success">Credito</span> : <span className="badge-soft badge-danger">Debito</span> },
          { header: "Valor", render: (row) => formatCurrency(row.valor) },
          { header: "Vencimento", key: "data_vencimento" },
          { header: "Status", render: (row) => <span className="badge-soft">{statusLabel(row.status)}</span> },
          { header: "Acoes", render: (row) => <div className="row-actions">{!isTransferencia(row) && <button className="secondary-button" onClick={() => editar(row)}>Editar</button>}{!isTransferencia(row) && Number(row.status) === 1 && <button className="action-button" onClick={() => confirmar(row)}>Confirmar</button>} {Number(row.status) !== 3 && <button className="danger-button" onClick={() => cancelar(row)}>{isTransferencia(row) ? "Cancelar par" : "Cancelar"}</button>}</div> },
        ]}
      />
    </PageLayout>
  );
};

export default Lancamentos;
