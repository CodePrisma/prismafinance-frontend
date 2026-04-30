/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { formatCpf, formatDateInput, onlyDigits } from "../../utils/formatters";

const getInitialForm = () => ({
  nome: "",
  cpf: "",
  email: "",
  senha: "",
  dataCadastro: formatDateInput(),
  dataExpiracao: formatDateInput(),
  situacao: 1,
  IDcliente: "",
});

const getOperadorId = (row) => row.IDOperador || row.idoperador || row.id;

const getDateValue = (value) => {
  if (!value) return formatDateInput();

  const brDate = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return `${brDate[3]}-${brDate[2]}-${brDate[1]}`;

  return formatDateInput(value);
};

const CadOperador = () => {
  const [form, setForm] = useState(getInitialForm);
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { isAdmin, clientes } = useAuthContext();

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const carregar = async () => {
    if (!isAdmin) return;
    try {
      const response = await api.get("/admin/operadores");
      setOperadores(response.data || []);
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel carregar operadores.", "error");
    }
  };

  useEffect(() => {
    carregar();
  }, [isAdmin]);

  const limpar = () => {
    setForm(getInitialForm());
    setEditingId(null);
  };

  const getPayload = () => ({
    nome: form.nome,
    cpf: onlyDigits(form.cpf),
    email: form.email,
    senha: form.senha,
    dataCadastro: form.dataCadastro,
    dataExpiracao: form.dataExpiracao,
    situacao: Number(form.situacao),
  });

  const salvar = async (event) => {
    event.preventDefault();
    if (!form.nome || !form.cpf || !form.email || !form.senha) {
      Swal.fire("Campos obrigatorios", "Informe nome, CPF, email e senha.", "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = getPayload();
      let idOperador = editingId;

      if (editingId) {
        await api.put(`/admin/operadores/${editingId}`, payload);
        Swal.fire("Operador atualizado", "Operador atualizado com sucesso.", "success");
      } else {
        const response = await api.post("/admin/operadores", payload);
        idOperador = response.data?.IDOperador || response.data?.id;
        Swal.fire("Operador salvo", "Operador cadastrado com sucesso.", "success");
      }

      if (form.IDcliente && idOperador) {
        await api.post(`/admin/operadores/${idOperador}/clientes`, {
          IDcliente: Number(form.IDcliente),
        });
      }

      limpar();
      await carregar();
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel salvar o operador.", "error");
    } finally {
      setLoading(false);
    }
  };

  const editar = (row) => {
    setEditingId(getOperadorId(row));
    setForm({
      nome: row.nome || "",
      cpf: formatCpf(row.cpf || ""),
      email: row.email || "",
      senha: row.senha || "",
      dataCadastro: getDateValue(row.dataCadastro),
      dataExpiracao: getDateValue(row.dataExpiracao),
      situacao: Number(row.situacao) === 1 || row.situacao === "Ativo" ? 1 : 0,
      IDcliente: row.IDcliente || row.idcliente || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remover = async (row) => {
    const id = getOperadorId(row);
    const confirm = await Swal.fire({ title: "Remover operador?", icon: "warning", showCancelButton: true, confirmButtonText: "Remover", cancelButtonText: "Cancelar" });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/admin/operadores/${id}`);
      if (Number(editingId) === Number(id)) limpar();
      await carregar();
      Swal.fire("Removido", "Operador removido com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel remover o operador.", "error");
    }
  };

  if (!isAdmin) {
    return (
      <PageLayout title="Cadastro de operador" eyebrow="Cadastro interno" requireCliente={false}>
        <section className="empty-state-card">
          <strong>Acesso restrito ao consultor admin</strong>
          <span>Somente o admin pode criar operadores e vincula-los aos clientes.</span>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Cadastro de operador" eyebrow="Cadastro interno" subtitle="Crie operadores e, quando nao forem admin, vincule-os a um cliente especifico." requireCliente={false}>
      <form className="crud-card" onSubmit={salvar}>
        <div className="form-grid">
          <label className="form-field span-4"><span>Nome</span><input value={form.nome} onChange={(e) => updateField("nome", e.target.value)} /></label>
          <label className="form-field span-3"><span>CPF</span><input inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => updateField("cpf", formatCpf(e.target.value))} /></label>
          <label className="form-field span-5"><span>Email</span><input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></label>
          <label className="form-field span-3"><span>Senha</span><input type="password" value={form.senha} onChange={(e) => updateField("senha", e.target.value)} /></label>
          <label className="form-field span-3"><span>Cadastro</span><input type="date" value={form.dataCadastro} onChange={(e) => updateField("dataCadastro", e.target.value)} /></label>
          <label className="form-field span-3"><span>Expiracao</span><input type="date" value={form.dataExpiracao} onChange={(e) => updateField("dataExpiracao", e.target.value)} /></label>
          <label className="form-field span-3"><span>Situacao</span><select value={form.situacao} onChange={(e) => updateField("situacao", e.target.value)}><option value={1}>Ativo</option><option value={0}>Inativo</option></select></label>
          <label className="form-field span-6"><span>Cliente vinculado</span><select value={form.IDcliente} onChange={(e) => updateField("IDcliente", e.target.value)}><option value="">Admin/consultor sem vinculo unico</option>{clientes.map((cliente) => <option key={cliente.IDcliente} value={cliente.IDcliente}>{cliente.nome}</option>)}</select></label>
        </div>
        <div className="form-footer">
          {editingId && <button type="button" className="secondary-button" onClick={limpar}>Cancelar edicao</button>}
          <button className="action-button" disabled={loading}>{loading ? "Salvando..." : editingId ? "Atualizar operador" : "Salvar operador"}</button>
        </div>
      </form>

      <DataTable
        data={operadores}
        columns={[
          { header: "Operador", render: (row) => <strong>{row.nome}</strong> },
          { header: "CPF", render: (row) => formatCpf(row.cpf) },
          { header: "Email", key: "email" },
          { header: "Situacao", render: (row) => Number(row.situacao) === 1 || row.situacao === "Ativo" ? <span className="badge-soft badge-success">Ativo</span> : <span className="badge-soft badge-warning">Inativo</span> },
          { header: "Acoes", render: (row) => <div className="row-actions"><button className="secondary-button" onClick={() => editar(row)}>Editar</button><button className="danger-button" onClick={() => remover(row)}>Remover</button></div> },
        ]}
      />
    </PageLayout>
  );
};

export default CadOperador;
