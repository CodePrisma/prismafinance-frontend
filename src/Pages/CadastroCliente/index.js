/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DataTable from "../../Componentes/DataTable";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { formatCpfCnpj, formatPhone, onlyDigits } from "../../utils/formatters";

const initialForm = {
  nome: "",
  cpf_cnpj: "",
  tipo: 2,
  inscricaoestadual: "",
  end_logradouro: "",
  end_num: "",
  end_compl: "",
  end_bairro: "",
  end_cidade: "",
  end_uf: "",
  cont_tel1: "",
  cont_cel1: "",
  email: "",
};

const normalizeList = (payload) => payload?.data || payload?.clientes || payload || [];
const getClienteId = (cliente) => cliente.IDcliente || cliente.idcliente || cliente.id;

const CadastroCliente = () => {
  const [form, setForm] = useState(initialForm);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { isAdmin, refreshClientes } = useAuthContext();

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const updateTipo = (value) => {
    setForm((current) => ({
      ...current,
      tipo: value,
      cpf_cnpj: formatCpfCnpj(current.cpf_cnpj, value),
    }));
  };

  const carregarClientes = async () => {
    if (!isAdmin) return;
    try {
      const response = await api.get("/admin/clientes?page=1&limit=100");
      setClientes(normalizeList(response.data));
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel carregar clientes.", "error");
    }
  };

  useEffect(() => {
    carregarClientes();
  }, [isAdmin]);

  const limpar = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const getPayload = () => ({
    ...form,
    tipo: Number(form.tipo),
    cpf_cnpj: onlyDigits(form.cpf_cnpj),
    inscricaoestadual: form.inscricaoestadual || null,
    cont_tel1: onlyDigits(form.cont_tel1) || null,
    cont_cel1: onlyDigits(form.cont_cel1) || null,
    end_logradouro: form.end_logradouro || null,
    end_num: form.end_num || null,
    end_compl: form.end_compl || null,
    end_bairro: form.end_bairro || null,
    end_cidade: form.end_cidade || null,
    end_uf: form.end_uf || null,
    email: form.email || null,
  });

  const salvar = async (event) => {
    event.preventDefault();
    if (!form.nome || !form.cpf_cnpj) {
      Swal.fire("Campos obrigatorios", "Informe nome e CPF/CNPJ.", "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = getPayload();

      if (editingId) {
        await api.put(`/admin/clientes/${editingId}`, payload);
        Swal.fire("Cliente atualizado", "Cliente atualizado com sucesso.", "success");
      } else {
        await api.post("/admin/clientes", payload);
        Swal.fire("Cliente salvo", "Cliente cadastrado com sucesso.", "success");
      }

      limpar();
      await carregarClientes();
      await refreshClientes();
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel salvar o cliente.", "error");
    } finally {
      setLoading(false);
    }
  };

  const editar = (cliente) => {
    const tipo = Number(cliente.tipo || 2);
    setEditingId(getClienteId(cliente));
    setForm({
      nome: cliente.nome || "",
      cpf_cnpj: formatCpfCnpj(cliente.cpf_cnpj || "", tipo),
      tipo,
      inscricaoestadual: cliente.inscricaoestadual || "",
      end_logradouro: cliente.end_logradouro || "",
      end_num: cliente.end_num || "",
      end_compl: cliente.end_compl || "",
      end_bairro: cliente.end_bairro || "",
      end_cidade: cliente.end_cidade || "",
      end_uf: cliente.end_uf || "",
      cont_tel1: formatPhone(cliente.cont_tel1 || ""),
      cont_cel1: formatPhone(cliente.cont_cel1 || ""),
      email: cliente.email || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remover = async (cliente) => {
    const id = getClienteId(cliente);
    const confirm = await Swal.fire({
      title: "Remover cliente?",
      text: "Essa acao depende das regras do backend e pode ser bloqueada se houver dados vinculados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/admin/clientes/${id}`);
      if (Number(editingId) === Number(id)) limpar();
      await carregarClientes();
      await refreshClientes();
      Swal.fire("Removido", "Cliente removido com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel remover o cliente.", "error");
    }
  };

  if (!isAdmin) {
    return (
      <PageLayout title="Cadastro de cliente" eyebrow="Cadastro interno" requireCliente={false}>
        <section className="empty-state-card">
          <strong>Acesso restrito ao consultor admin</strong>
          <span>Operadores comuns visualizam apenas os dados do cliente vinculado.</span>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Cadastro de cliente"
      eyebrow="Cadastro interno"
      subtitle="Cadastre as empresas atendidas pela consultoria. Depois disso o admin escolhe o cliente ativo no menu lateral."
      requireCliente={false}
    >
      <form className="crud-card" onSubmit={salvar}>
        <div className="form-grid">
          <label className="form-field span-6"><span>Nome / razao social</span><input value={form.nome} onChange={(e) => updateField("nome", e.target.value)} /></label>
          <label className="form-field span-3"><span>CPF/CNPJ</span><input inputMode="numeric" placeholder={Number(form.tipo) === 1 ? "000.000.000-00" : "00.000.000/0000-00"} value={form.cpf_cnpj} onChange={(e) => updateField("cpf_cnpj", formatCpfCnpj(e.target.value, form.tipo))} /></label>
          <label className="form-field span-3"><span>Tipo</span><select value={form.tipo} onChange={(e) => updateTipo(e.target.value)}><option value={1}>Pessoa fisica</option><option value={2}>Pessoa juridica</option></select></label>
          <label className="form-field span-3"><span>Inscricao estadual</span><input value={form.inscricaoestadual} onChange={(e) => updateField("inscricaoestadual", e.target.value)} /></label>
          <label className="form-field span-3"><span>Email</span><input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></label>
          <label className="form-field span-3"><span>Telefone</span><input inputMode="tel" placeholder="(00) 0000-0000" value={form.cont_tel1} onChange={(e) => updateField("cont_tel1", formatPhone(e.target.value))} /></label>
          <label className="form-field span-3"><span>Celular</span><input inputMode="tel" placeholder="(00) 00000-0000" value={form.cont_cel1} onChange={(e) => updateField("cont_cel1", formatPhone(e.target.value))} /></label>
          <label className="form-field span-6"><span>Logradouro</span><input value={form.end_logradouro} onChange={(e) => updateField("end_logradouro", e.target.value)} /></label>
          <label className="form-field span-2"><span>Numero</span><input value={form.end_num} onChange={(e) => updateField("end_num", e.target.value)} /></label>
          <label className="form-field span-4"><span>Complemento</span><input value={form.end_compl} onChange={(e) => updateField("end_compl", e.target.value)} /></label>
          <label className="form-field span-4"><span>Bairro</span><input value={form.end_bairro} onChange={(e) => updateField("end_bairro", e.target.value)} /></label>
          <label className="form-field span-4"><span>Cidade</span><input value={form.end_cidade} onChange={(e) => updateField("end_cidade", e.target.value)} /></label>
          <label className="form-field span-2"><span>UF</span><input maxLength="2" value={form.end_uf} onChange={(e) => updateField("end_uf", e.target.value.toUpperCase())} /></label>
        </div>
        <div className="form-footer">
          {editingId && <button type="button" className="secondary-button" onClick={limpar}>Cancelar edicao</button>}
          <button className="action-button" disabled={loading}>{loading ? "Salvando..." : editingId ? "Atualizar cliente" : "Salvar cliente"}</button>
        </div>
      </form>

      <DataTable
        data={clientes}
        columns={[
          { header: "Cliente", render: (row) => <strong>{row.nome}</strong> },
          { header: "CPF/CNPJ", render: (row) => formatCpfCnpj(row.cpf_cnpj, row.tipo) },
          { header: "Tipo", render: (row) => Number(row.tipo) === 1 ? "Pessoa fisica" : "Pessoa juridica" },
          { header: "Email", key: "email" },
          { header: "Acoes", render: (row) => <div className="row-actions"><button className="secondary-button" onClick={() => editar(row)}>Editar</button><button className="danger-button" onClick={() => remover(row)}>Remover</button></div> },
        ]}
      />
    </PageLayout>
  );
};

export default CadastroCliente;
