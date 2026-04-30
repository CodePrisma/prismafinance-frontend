/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { formatCurrency, formatDateInput } from "../../utils/formatters";

const bancoIcons = {
  1: "BB",
  33: "ST",
  104: "CX",
  237: "BR",
  260: "NU",
  341: "IT",
  356: "RS",
  422: "SA",
  748: "SC",
};

const getInitialForm = () => ({
  banco: "",
  agencia: "",
  contacorrente: "",
  nomebanco: "",
  obs: "",
  ativa: 1,
  saldo_inicial: "",
  data_saldo_inicial: formatDateInput(),
});

const getContaId = (row) => row.IDcontabancaria || row.idcontabancaria || row.id;

const ContasBancarias = () => {
  const { clienteAtivo } = useAuthContext();
  const [form, setForm] = useState(getInitialForm);
  const [editingId, setEditingId] = useState(null);
  const [contas, setContas] = useState([]);
  const [saldos, setSaldos] = useState([]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const carregar = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const [contasResponse, saldosResponse] = await Promise.all([
      api.get(`/clientes/${clienteAtivo.IDcliente}/contas-bancarias`),
      api.get(`/clientes/${clienteAtivo.IDcliente}/saldos-bancarios`).catch(() => ({ data: [] })),
    ]);
    setContas(contasResponse.data || []);
    setSaldos(saldosResponse.data || []);
  };

  useEffect(() => {
    carregar().catch(() => Swal.fire("Erro", "Nao foi possivel carregar contas bancarias.", "error"));
  }, [clienteAtivo]);

  const limpar = () => {
    setForm(getInitialForm());
    setEditingId(null);
  };

  const salvar = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      banco: Number(form.banco),
      ativa: Boolean(Number(form.ativa)),
      saldo_inicial: Number(form.saldo_inicial || 0),
      data_saldo_inicial: form.data_saldo_inicial || formatDateInput(),
    };

    try {
      if (editingId) {
        await api.put(`/clientes/${clienteAtivo.IDcliente}/contas-bancarias/${editingId}`, payload);
        Swal.fire("Conta atualizada", "Conta bancaria atualizada com sucesso.", "success");
      } else {
        await api.post(`/clientes/${clienteAtivo.IDcliente}/contas-bancarias`, payload);
        Swal.fire("Conta salva", "Conta bancaria cadastrada com sucesso.", "success");
      }
      limpar();
      await carregar();
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel salvar a conta bancaria.", "error");
    }
  };

  const editar = (row) => {
    setEditingId(getContaId(row));
    setForm({
      banco: String(row.banco || ""),
      agencia: row.agencia || "",
      contacorrente: row.contacorrente || "",
      nomebanco: row.nomebanco || "",
      obs: row.obs || "",
      ativa: Number(row.ativa ?? 1),
      saldo_inicial: String(row.saldo_inicial || 0),
      data_saldo_inicial: row.data_saldo_inicial || formatDateInput(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remover = async (row) => {
    const id = getContaId(row);
    const confirm = await Swal.fire({
      title: "Remover conta bancaria?",
      text: "O backend pode bloquear a remocao caso existam lancamentos vinculados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/clientes/${clienteAtivo.IDcliente}/contas-bancarias/${id}`);
      await carregar();
      Swal.fire("Removida", "Conta bancaria removida com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel remover a conta bancaria.", "error");
    }
  };

  return (
    <PageLayout title="Contas bancarias" eyebrow="Cadastros" subtitle="Cadastre bancos com saldo inicial e acompanhe o saldo atualizado por conta.">
      <div className="metrics-grid">
        {saldos.map((saldo) => (
          <article className="metric-card" key={saldo.IDcontabancaria}>
            <span>{saldo.nomebanco}</span>
            <strong>{formatCurrency(saldo.saldo_atual)}</strong>
          </article>
        ))}
      </div>

      <form className="crud-card" onSubmit={salvar}>
        <div className="form-grid">
          <label className="form-field span-2"><span>Cod. FEBRABAN</span><input value={form.banco} onChange={(e) => updateField("banco", e.target.value)} /></label>
          <label className="form-field span-4"><span>Nome do banco</span><input value={form.nomebanco} onChange={(e) => updateField("nomebanco", e.target.value)} /></label>
          <label className="form-field span-3"><span>Agencia</span><input value={form.agencia} onChange={(e) => updateField("agencia", e.target.value)} /></label>
          <label className="form-field span-3"><span>Conta corrente</span><input value={form.contacorrente} onChange={(e) => updateField("contacorrente", e.target.value)} /></label>
          <label className="form-field span-3"><span>Saldo inicial</span><input type="number" step="0.01" value={form.saldo_inicial} onChange={(e) => updateField("saldo_inicial", e.target.value)} /></label>
          <label className="form-field span-3"><span>Data saldo inicial</span><input type="date" value={form.data_saldo_inicial} onChange={(e) => updateField("data_saldo_inicial", e.target.value)} /></label>
          <label className="form-field span-3"><span>Ativa</span><select value={form.ativa} onChange={(e) => updateField("ativa", e.target.value)}><option value={1}>Sim</option><option value={0}>Nao</option></select></label>
          <label className="form-field span-12"><span>Observacao</span><textarea value={form.obs} onChange={(e) => updateField("obs", e.target.value)} /></label>
        </div>
        <div className="form-footer">
          {editingId && <button type="button" className="secondary-button" onClick={limpar}>Cancelar edicao</button>}
          <button className="action-button">{editingId ? "Atualizar conta" : "Salvar conta"}</button>
        </div>
      </form>

      <DataTable
        data={contas}
        columns={[
          { header: "Banco", render: (row) => <strong><span className="bank-chip">{bancoIcons[row.banco] || row.banco}</span> {row.nomebanco}</strong> },
          { header: "Agencia", key: "agencia" },
          { header: "Conta", key: "contacorrente" },
          { header: "Saldo inicial", render: (row) => formatCurrency(row.saldo_inicial) },
          { header: "Data", key: "data_saldo_inicial" },
          { header: "Status", render: (row) => Number(row.ativa) === 1 ? <span className="badge-soft badge-success">Ativa</span> : <span className="badge-soft badge-warning">Inativa</span> },
          { header: "Acoes", render: (row) => <div className="row-actions"><button className="secondary-button" onClick={() => editar(row)}>Editar</button><button className="danger-button" onClick={() => remover(row)}>Remover</button></div> },
        ]}
      />
    </PageLayout>
  );
};

export default ContasBancarias;
