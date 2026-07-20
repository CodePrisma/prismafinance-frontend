/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";

const initialForm = { nome: "", ordem: "", tipo_resultado: 1 };

const tiposResultado = {
  1: "Receita operacional",
  2: "Custo dos servicos vendidos",
  3: "Despesa operacional",
  4: "Impostos",
  5: "Despesa financeira",
  6: "Outra receita",
  7: "Outra despesa",
};

const CadGrupoDRE = () => {
  const { clienteAtivo } = useAuthContext();
  const [grupos, setGrupos] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const carregar = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const response = await api.get(`/clientes/${clienteAtivo.IDcliente}/grupos-dre`);
    setGrupos(response.data || []);
  };

  useEffect(() => {
    carregar().catch(() => Swal.fire("Erro", "Nao foi possivel carregar os grupos DRE.", "error"));
  }, [clienteAtivo]);

  const limpar = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!form.nome.trim() || !form.ordem) {
      Swal.fire("Campos obrigatorios", "Informe nome e ordem do grupo.", "warning");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      ordem: Number(form.ordem),
      tipo_resultado: Number(form.tipo_resultado),
    };

    try {
      if (editingId) {
        await api.put(`/clientes/${clienteAtivo.IDcliente}/grupos-dre/${editingId}`, payload);
        Swal.fire("Grupo atualizado", "Grupo DRE atualizado com sucesso.", "success");
      } else {
        await api.post(`/clientes/${clienteAtivo.IDcliente}/grupos-dre`, payload);
        Swal.fire("Grupo salvo", "Grupo DRE cadastrado com sucesso.", "success");
      }

      limpar();
      await carregar();
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel salvar o grupo DRE.", "error");
    }
  };

  const editar = (grupo) => {
    setEditingId(grupo.IDgrupoDRE);
    setForm({
      nome: grupo.nome || "",
      ordem: grupo.ordem || "",
      tipo_resultado: Number(grupo.tipo_resultado || 1),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remover = async (grupo) => {
    const confirmacao = await Swal.fire({
      title: "Remover grupo DRE?",
      text: "O grupo so podera ser removido se nao possuir categorias ativas.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
    });
    if (!confirmacao.isConfirmed) return;

    try {
      await api.delete(`/clientes/${clienteAtivo.IDcliente}/grupos-dre/${grupo.IDgrupoDRE}`);
      if (editingId === grupo.IDgrupoDRE) limpar();
      await carregar();
      Swal.fire("Removido", "Grupo DRE removido com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel remover o grupo DRE.", "error");
    }
  };

  return (
    <PageLayout title="Grupos DRE" eyebrow="Cadastros" subtitle="Estrutura de agrupamento usada no demonstrativo de resultado do cliente.">
      <form className="crud-card" onSubmit={salvar}>
        <div className="form-grid">
          <label className="form-field span-6">
            <span>Nome do grupo</span>
            <input value={form.nome} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </label>
          <label className="form-field span-2">
            <span>Ordem</span>
            <input type="number" min="1" value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))} />
          </label>
          <label className="form-field span-4">
            <span>Tipo de resultado</span>
            <select value={form.tipo_resultado} onChange={(e) => setForm((f) => ({ ...f, tipo_resultado: e.target.value }))}>
              {Object.entries(tiposResultado).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="form-footer">
          {editingId && <button type="button" className="secondary-button" onClick={limpar}>Cancelar edicao</button>}
          <button className="action-button">{editingId ? "Atualizar grupo" : "Salvar grupo"}</button>
        </div>
      </form>

      <DataTable
        data={grupos}
        columns={[
          { header: "Ordem", key: "ordem" },
          { header: "Grupo", render: (row) => <strong>{row.nome}</strong> },
          { header: "Tipo de resultado", render: (row) => tiposResultado[Number(row.tipo_resultado)] || row.tipo_resultado },
          { header: "Origem", render: (row) => row.IDcliente ? <span className="badge-soft">Cliente</span> : <span className="badge-soft badge-warning">Padrao</span> },
          { header: "Acoes", render: (row) => row.IDcliente ? <div className="row-actions"><button className="secondary-button" onClick={() => editar(row)}>Editar</button><button className="danger-button" onClick={() => remover(row)}>Remover</button></div> : <span className="badge-soft">Protegido</span> },
        ]}
      />
    </PageLayout>
  );
};

export default CadGrupoDRE;
