/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";

const initialForm = {
  IDgrupoDRE: "",
  nome: "",
  tipo: 1,
  ativa: 1,
};

const getCategoriaId = (row) => row.IDcatfinanceira || row.idcatfinanceira || row.id;

const CadCategoria = () => {
  const { clienteAtivo } = useAuthContext();
  const [categorias, setCategorias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const carregar = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const [categoriasResponse, gruposResponse] = await Promise.all([
      api.get(`/clientes/${clienteAtivo.IDcliente}/categorias-financeiras`),
      api.get(`/clientes/${clienteAtivo.IDcliente}/grupos-dre`).catch(() => api.get("/grupos-dre")),
    ]);

    const gruposApi = gruposResponse.data || [];
    setCategorias(categoriasResponse.data || []);
    setGrupos(gruposApi);

    if (!form.IDgrupoDRE && gruposApi.length) {
      setForm((current) => ({ ...current, IDgrupoDRE: gruposApi[0].IDgrupoDRE }));
    }
  };

  useEffect(() => {
    carregar().catch(() => Swal.fire("Erro", "Nao foi possivel carregar categorias financeiras.", "error"));
  }, [clienteAtivo]);

  const limpar = () => {
    setForm({ ...initialForm, IDgrupoDRE: grupos[0]?.IDgrupoDRE || "" });
    setEditingId(null);
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!form.nome || !form.IDgrupoDRE) {
      Swal.fire("Campos obrigatorios", "Informe nome e grupo DRE.", "warning");
      return;
    }

    const payload = {
      IDgrupoDRE: Number(form.IDgrupoDRE),
      nome: form.nome,
      tipo: Number(form.tipo),
      ativa: Boolean(Number(form.ativa)),
    };

    try {
      if (editingId) {
        await api.put(`/clientes/${clienteAtivo.IDcliente}/categorias-financeiras/${editingId}`, payload);
        Swal.fire("Categoria atualizada", "Categoria atualizada com sucesso.", "success");
      } else {
        await api.post(`/clientes/${clienteAtivo.IDcliente}/categorias-financeiras`, payload);
        Swal.fire("Categoria salva", "Categoria cadastrada com sucesso.", "success");
      }

      limpar();
      await carregar();
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel salvar a categoria.", "error");
    }
  };

  const editar = (row) => {
    setEditingId(getCategoriaId(row));
    setForm({
      IDgrupoDRE: row.IDgrupoDRE || "",
      nome: row.nome || "",
      tipo: Number(row.tipo || 1),
      ativa: Number(row.ativa ?? 1),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remover = async (row) => {
    const id = getCategoriaId(row);
    const confirm = await Swal.fire({
      title: "Remover categoria?",
      text: row.IDcliente ? "A categoria propria do cliente sera inativada." : "Categorias padrao podem ser protegidas pelo backend.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/clientes/${clienteAtivo.IDcliente}/categorias-financeiras/${id}`);
      await carregar();
      Swal.fire("Removida", "Categoria removida com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel remover a categoria.", "error");
    }
  };

  return (
    <PageLayout title="Categorias financeiras" eyebrow="Cadastros" subtitle="Categorias usadas nos lancamentos e agrupadas pela estrutura da DRE.">
      <form className="crud-card" onSubmit={salvar}>
        <div className="form-grid">
          <label className="form-field span-4">
            <span>Nome da categoria</span>
            <input value={form.nome} onChange={(e) => updateField("nome", e.target.value)} />
          </label>
          <label className="form-field span-4">
            <span>Grupo DRE</span>
            <select value={form.IDgrupoDRE} onChange={(e) => updateField("IDgrupoDRE", e.target.value)}>
              <option value="">Selecione</option>
              {grupos.map((grupo) => (
                <option key={grupo.IDgrupoDRE} value={grupo.IDgrupoDRE}>{grupo.nome}</option>
              ))}
            </select>
          </label>
          <label className="form-field span-2">
            <span>Tipo</span>
            <select value={form.tipo} onChange={(e) => updateField("tipo", e.target.value)}>
              <option value={1}>Credito</option>
              <option value={2}>Debito</option>
            </select>
          </label>
          <label className="form-field span-2">
            <span>Ativa</span>
            <select value={form.ativa} onChange={(e) => updateField("ativa", e.target.value)}>
              <option value={1}>Sim</option>
              <option value={0}>Nao</option>
            </select>
          </label>
        </div>
        <div className="form-footer">
          {editingId && <button type="button" className="secondary-button" onClick={limpar}>Cancelar edicao</button>}
          <button className="action-button">{editingId ? "Atualizar categoria" : "Salvar categoria"}</button>
        </div>
      </form>

      <DataTable
        data={categorias}
        columns={[
          { header: "Categoria", render: (row) => <strong>{row.nome}</strong> },
          { header: "Grupo DRE", key: "grupoDRE" },
          { header: "Origem", render: (row) => row.IDcliente ? <span className="badge-soft">Cliente</span> : <span className="badge-soft">Padrao</span> },
          { header: "Tipo", render: (row) => Number(row.tipo) === 1 ? <span className="badge-soft badge-success">Credito / receita</span> : <span className="badge-soft badge-danger">Debito / despesa</span> },
          { header: "Status", render: (row) => Number(row.ativa) === 1 ? <span className="badge-soft badge-success">Ativa</span> : <span className="badge-soft badge-warning">Inativa</span> },
          { header: "Acoes", render: (row) => <div className="row-actions"><button className="secondary-button" onClick={() => editar(row)}>Editar</button><button className="danger-button" onClick={() => remover(row)}>Remover</button></div> },
        ]}
      />
    </PageLayout>
  );
};

export default CadCategoria;
