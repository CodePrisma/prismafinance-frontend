/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import PageLayout from "../../Componentes/PageLayout";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { currentCompetencia, formatDateDisplay, formatDateInput, monthName } from "../../utils/formatters";
import "./styles.css";

const getInitialActionForm = () => ({
  idsituacaoacao: "",
  titulo: "",
  descricao: "",
  prioridade: 2,
  data_previsao: formatDateInput(),
  ordem: 1,
});

// Painel de criacao de colunas oculto temporariamente.
// const initialSituationForm = {
//   nome: "",
//   ordem: 1,
//   cor: "#c8a96a",
//   ativo: 1,
// };

const getAcaoId = (acao) => acao.idacao || acao.idacaoquadro || acao.IDacao || acao.id;
const getSituacaoId = (situacao) => situacao.idsituacaoacao || situacao.IDsituacaoacao || situacao.id;
const getAcaoDataPrevisao = (acao) => acao.data_previsao || acao.data_prazo;
const getSituacaoOrdem = (situacao) => Number(situacao?.ordem || 9999);
const getAcaoDataConclusao = (acao) =>
  acao.data_conclusao ||
  acao.dataconclusao ||
  acao.concluido_em ||
  acao.concluida_em ||
  acao.data_finalizacao ||
  acao.datafinalizacao ||
  acao.updatedAt ||
  acao.updated_at;

const getDateParts = (date) => {
  if (!date) return null;

  const isoDate = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return { ano: Number(isoDate[1]), mes: Number(isoDate[2]) };

  const brDate = String(date).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return { ano: Number(brDate[3]), mes: Number(brDate[2]) };

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return { ano: parsed.getFullYear(), mes: parsed.getMonth() + 1 };
};

const isAcaoConcluidaNoPeriodo = (acao, filtro) => {
  const dataConclusao = getDateParts(getAcaoDataConclusao(acao));
  if (!dataConclusao) return false;

  return dataConclusao.ano === Number(filtro.ano) && dataConclusao.mes === Number(filtro.mes);
};

const priorityLabel = {
  1: "Urgente",
  2: "Importante",
  3: "Necessaria",
};

const Acoes = () => {
  const { clienteAtivo } = useAuthContext();
  const competenciaAtual = currentCompetencia();
  const [quadros, setQuadros] = useState([]);
  const [quadroId, setQuadroId] = useState("");
  const [kanban, setKanban] = useState(null);
  const [actionForm, setActionForm] = useState(getInitialActionForm);
  // const [situationForm, setSituationForm] = useState(initialSituationForm);
  const [filtroConcluidas, setFiltroConcluidas] = useState({ ano: competenciaAtual.ano, mes: competenciaAtual.mes });
  const [editingActionId, setEditingActionId] = useState(null);
  const [draggedAction, setDraggedAction] = useState(null);
  const [dragOverSituacaoId, setDragOverSituacaoId] = useState(null);
  const [movingActionId, setMovingActionId] = useState(null);

  const situacoes = useMemo(() => [...(kanban?.situacoes || [])].sort((a, b) => getSituacaoOrdem(a) - getSituacaoOrdem(b)), [kanban]);
  const ultimaSituacao = situacoes[situacoes.length - 1];

  const updateActionField = (field, value) => setActionForm((current) => ({ ...current, [field]: value }));
  // const updateSituationField = (field, value) => setSituationForm((current) => ({ ...current, [field]: value }));
  const updateFiltroConcluidas = (field, value) => setFiltroConcluidas((current) => ({ ...current, [field]: value }));

  const carregarQuadros = async () => {
    if (!clienteAtivo?.IDcliente) return;
    const response = await api.get(`/clientes/${clienteAtivo.IDcliente}/quadros-acao`);
    const lista = response.data || [];
    setQuadros(lista);
    const primeiroId = lista[0]?.idquadroacao || lista[0]?.IDquadroacao || lista[0]?.id;
    if (!quadroId && primeiroId) setQuadroId(String(primeiroId));
  };

  const carregarKanban = async () => {
    if (!quadroId) return;
    const response = await api.get(`/quadros-acao/${quadroId}/kanban`);
    const data = response.data;
    setKanban(data);
    const primeiraSituacao = data?.situacoes?.[0];
    if (primeiraSituacao && !actionForm.idsituacaoacao) {
      setActionForm((current) => ({ ...current, idsituacaoacao: getSituacaoId(primeiraSituacao) }));
    }
    // setSituationForm((current) => ({ ...current, ordem: (data?.situacoes?.length || 0) + 1 }));
  };

  useEffect(() => {
    carregarQuadros().catch(() => Swal.fire("Erro", "Nao foi possivel carregar quadros de ações.", "error"));
  }, [clienteAtivo]);

  useEffect(() => {
    carregarKanban().catch(() => Swal.fire("Erro", "Nao foi possivel carregar o quadro.", "error"));
  }, [quadroId]);

  const limparAcao = () => {
    setEditingActionId(null);
    setActionForm({
      ...getInitialActionForm(),
      idsituacaoacao: situacoes[0] ? getSituacaoId(situacoes[0]) : "",
    });
  };

  const salvarAcao = async (event) => {
    event.preventDefault();
    if (!quadroId || !actionForm.idsituacaoacao || !actionForm.titulo) {
      Swal.fire("Campos obrigatorios", "Informe situacao e titulo da acao.", "warning");
      return;
    }

    const payload = {
      ...actionForm,
      idsituacaoacao: Number(actionForm.idsituacaoacao),
      prioridade: Number(actionForm.prioridade),
      ordem: Number(actionForm.ordem || 1),
    };

    try {
      if (editingActionId) {
        await api.put(`/acoes/${editingActionId}`, payload);
        Swal.fire("Acao atualizada", "Acao atualizada com sucesso.", "success");
      } else {
        await api.post(`/quadros-acao/${quadroId}/acoes`, payload);
        Swal.fire("Acao criada", "Acao criada com sucesso.", "success");
      }
      limparAcao();
      await carregarKanban();
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel salvar a acao.", "error");
    }
  };

  const editarAcao = (acao, situacao) => {
    setEditingActionId(getAcaoId(acao));
    setActionForm({
      idsituacaoacao: getSituacaoId(situacao),
      titulo: acao.titulo || acao.descricao || "",
      descricao: acao.descricao || "",
      prioridade: Number(acao.prioridade || 2),
      data_previsao: acao.data_previsao || acao.data_prazo || formatDateInput(),
      ordem: Number(acao.ordem || 1),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removerAcao = async (acao) => {
    const confirm = await Swal.fire({ title: "Remover acao?", icon: "warning", showCancelButton: true, confirmButtonText: "Remover", cancelButtonText: "Cancelar" });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/acoes/${getAcaoId(acao)}`);
      await carregarKanban();
      Swal.fire("Removida", "Acao removida com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel remover a acao.", "error");
    }
  };

  // const salvarSituacao = async (event) => {
  //   event.preventDefault();
  //   if (!quadroId || !situationForm.nome) {
  //     Swal.fire("Campos obrigatorios", "Informe o nome da coluna.", "warning");
  //     return;
  //   }
  //
  //   try {
  //     await api.post(`/quadros-acao/${quadroId}/situacoes`, {
  //       ...situationForm,
  //       ordem: Number(situationForm.ordem || situacoes.length + 1),
  //       ativo: Boolean(Number(situationForm.ativo)),
  //     });
  //     setSituationForm({ ...initialSituationForm, ordem: situacoes.length + 2 });
  //     await carregarKanban();
  //     Swal.fire("Coluna criada", "Situacao criada com sucesso.", "success");
  //   } catch (error) {
  //     Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel criar a coluna.", "error");
  //   }
  // };

  const removerSituacao = async (situacao) => {
    const confirm = await Swal.fire({
      title: "Remover coluna?",
      text: "Se houver ações vinculadas, o backend pode bloquear essa operacao.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/situacoes-acao/${getSituacaoId(situacao)}`);
      await carregarKanban();
      Swal.fire("Removida", "Coluna removida com sucesso.", "success");
    } catch (error) {
      Swal.fire("Erro", error.response?.data?.errors?.default || "Nao foi possivel remover a coluna.", "error");
    }
  };

  const mover = async (acao, situacao, direction) => {
    const currentIndex = situacoes.findIndex((item) => Number(getSituacaoId(item)) === Number(getSituacaoId(situacao)));
    const next = situacoes[currentIndex + direction];
    if (!next) return;

    await moverParaSituacao(acao, situacao, next);
  };

  const moverParaSituacao = async (acao, situacaoOrigem, situacaoDestino) => {
    const origemId = Number(getSituacaoId(situacaoOrigem));
    const destinoId = Number(getSituacaoId(situacaoDestino));
    if (!destinoId || origemId === destinoId) return;

    const acaoId = getAcaoId(acao);
    setMovingActionId(acaoId);
    try {
      await api.patch(`/acoes/${acaoId}/mover`, {
        idsituacaoacao: destinoId,
        ordem: (situacaoDestino.acoes?.length || 0) + 1,
      });
      await carregarKanban();
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel mover a acao.", "error");
    } finally {
      setMovingActionId(null);
    }
  };

  const iniciarArrasto = (event, acao, situacao) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(getAcaoId(acao)));
    setDraggedAction({ acao, situacao });
  };

  const permitirSoltar = (event, situacao) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverSituacaoId(getSituacaoId(situacao));
  };

  const soltarAcao = async (event, situacaoDestino) => {
    event.preventDefault();
    setDragOverSituacaoId(null);

    if (!draggedAction) return;
    await moverParaSituacao(draggedAction.acao, draggedAction.situacao, situacaoDestino);
    setDraggedAction(null);
  };

  const finalizarArrasto = () => {
    setDraggedAction(null);
    setDragOverSituacaoId(null);
  };

  const concluir = async (acao) => {
    const ultimaColuna = situacoes[situacoes.length - 1];
    const acaoId = getAcaoId(acao);

    try {
      await api.patch(`/acoes/${acaoId}/concluir`, { data_conclusao: formatDateInput() });
      if (ultimaColuna) {
        await api.patch(`/acoes/${acaoId}/mover`, {
          idsituacaoacao: Number(getSituacaoId(ultimaColuna)),
          ordem: (ultimaColuna.acoes?.length || 0) + 1,
        });
      }
      await carregarKanban();
    } catch (error) {
      Swal.fire("Erro", "Nao foi possivel concluir a acao.", "error");
    }
  };

  return (
    <PageLayout title="Ações e situações" eyebrow="Kanban" subtitle="Quadro operacional estilo Trello para acompanhar pendencias, retornos e conclusoes.">
      {!!quadros.length && (
        <div className="kanban-forms-grid">
          <form className="crud-card" onSubmit={salvarAcao}>
            <h2 className="section-title">{editingActionId ? "Editar ação" : "Nova ação"}</h2>
            <div className="form-grid">
              <label className="form-field span-4"><span>Situacao</span><select value={actionForm.idsituacaoacao} onChange={(e) => updateActionField("idsituacaoacao", e.target.value)}><option value="">Selecione</option>{situacoes.map((situacao) => <option key={getSituacaoId(situacao)} value={getSituacaoId(situacao)}>{situacao.nome}</option>)}</select></label>
              <label className="form-field span-4"><span>Titulo</span><input value={actionForm.titulo} onChange={(e) => updateActionField("titulo", e.target.value)} /></label>
              <label className="form-field span-2"><span>Prioridade</span><select value={actionForm.prioridade} onChange={(e) => updateActionField("prioridade", e.target.value)}><option value={1}>Urgente</option><option value={2}>Importante</option><option value={3}>Necessaria</option></select></label>
              <label className="form-field span-2"><span>Previsao</span><input type="date" value={actionForm.data_previsao} onChange={(e) => updateActionField("data_previsao", e.target.value)} /></label>
              <label className="form-field span-12"><span>Descricao</span><textarea value={actionForm.descricao} onChange={(e) => updateActionField("descricao", e.target.value)} /></label>
            </div>
            <div className="form-footer">{editingActionId && <button type="button" className="secondary-button" onClick={limparAcao}>Cancelar edicao</button>}<button className="action-button">{editingActionId ? "Atualizar ação" : "Criar ação"}</button></div>
          </form>

          {/*
          <form className="crud-card" onSubmit={salvarSituacao}>
            <h2 className="section-title">Nova coluna</h2>
            <div className="form-grid">
              <label className="form-field span-6"><span>Nome</span><input value={situationForm.nome} onChange={(e) => updateSituationField("nome", e.target.value)} /></label>
              <label className="form-field span-3"><span>Ordem</span><input type="number" value={situationForm.ordem} onChange={(e) => updateSituationField("ordem", e.target.value)} /></label>
              <label className="form-field span-3"><span>Cor</span><input type="color" value={situationForm.cor} onChange={(e) => updateSituationField("cor", e.target.value)} /></label>
            </div>
            <div className="form-footer"><button className="action-button">Criar coluna</button></div>
          </form>
          */}
        </div>
      )}

      {!!quadros.length && ultimaSituacao && (
        <section className="filter-card concluded-filter">
          <div>
            <span>Concluidas</span>
            <strong>{monthName(filtroConcluidas.mes)} / {filtroConcluidas.ano}</strong>
          </div>
          <div className="filter-row">
            <label>Mes <input type="number" min="1" max="12" value={filtroConcluidas.mes} onChange={(e) => updateFiltroConcluidas("mes", e.target.value)} /></label>
            <label>Ano <input type="number" value={filtroConcluidas.ano} onChange={(e) => updateFiltroConcluidas("ano", e.target.value)} /></label>
          </div>
        </section>
      )}

      {!quadros.length ? (
        <section className="empty-state-card">
          <strong>Nenhum quadro encontrado para este cliente</strong>
          <span>Ao cadastrar um cliente novo, a API agora cria automaticamente o quadro padrao e suas situacoes.</span>
        </section>
      ) : (
        <section className="actions-kanban">
          {situacoes.map((situacao) => {
            const isUltimaColuna = Number(getSituacaoId(situacao)) === Number(getSituacaoId(ultimaSituacao));
            const acoesVisiveis = isUltimaColuna
              ? (situacao.acoes || []).filter((acao) => isAcaoConcluidaNoPeriodo(acao, filtroConcluidas))
              : (situacao.acoes || []);

            return (
            <article
              className={`kanban-page-column ${Number(dragOverSituacaoId) === Number(getSituacaoId(situacao)) ? "is-drag-over" : ""}`}
              key={getSituacaoId(situacao)}
              style={{ "--column-color": situacao.cor || "#c8a96a" }}
              onDragOver={(event) => permitirSoltar(event, situacao)}
              onDragLeave={() => setDragOverSituacaoId(null)}
              onDrop={(event) => soltarAcao(event, situacao)}
            >
              <header>
                <span>{situacao.nome}</span>
                <div className="kanban-column-actions"><b>{acoesVisiveis.length}</b><button type="button" onClick={() => removerSituacao(situacao)}>x</button></div>
              </header>
              <div className="kanban-page-list">
                {acoesVisiveis.map((acao) => (
                  <div
                    className={`action-card ${Number(movingActionId) === Number(getAcaoId(acao)) ? "is-moving" : ""}`}
                    key={getAcaoId(acao)}
                    draggable
                    onDragStart={(event) => iniciarArrasto(event, acao, situacao)}
                    onDragEnd={finalizarArrasto}
                  >
                    <strong>{acao.titulo || acao.descricao || "Acao"}</strong>
                    {acao.descricao && <p>{acao.descricao}</p>}
                    <small>{priorityLabel[Number(acao.prioridade)] || "Importante"} {getAcaoDataPrevisao(acao) ? `- ${formatDateDisplay(getAcaoDataPrevisao(acao))}` : ""}</small>
                    <div className="action-card-footer">
                      <button type="button" className="secondary-button" onClick={() => mover(acao, situacao, -1)}>Voltar</button>
                      <button type="button" className="secondary-button" onClick={() => mover(acao, situacao, 1)}>Avancar</button>
                      <button type="button" className="secondary-button" onClick={() => editarAcao(acao, situacao)}>Editar</button>
                      {!isUltimaColuna && <button type="button" className="action-button" onClick={() => concluir(acao)}>Concluir</button>}
                      <button type="button" className="danger-button" onClick={() => removerAcao(acao)}>Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
          })}
        </section>
      )}
    </PageLayout>
  );
};

export default Acoes;
