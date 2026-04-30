import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import GridRegistros from "../../Componentes/GridRegistros";
import MenuLateral from "../../Componentes/MenuLateral";
import MenuSuperior from "../../Componentes/MenuSuperior";
import api from "../../Services/api";
import { useAuthContext } from "../../context/authContext";
import { useOperador } from "../../Hooks/useOperador";
import "./index.css";

const CadastroCargo = () => {
  const [descricao, setDescricao] = useState("");
  const [permissoes, setPermissoes] = useState([]);
  const [permissaoSelecionada, setPermissaoSelecionada] = useState(null);
  const [cargos, setCargos] = useState([]);

  const { authReady } = useAuthContext();
  const { IDOperador, nome, operador } = useOperador();
  const navigate = useNavigate();

  const idFormatado = String(IDOperador ?? "").padStart(6, "0");

  useEffect(() => {
    if (authReady && !operador) {
      navigate("/");
    }
  }, [authReady, navigate, operador]);

  useEffect(() => {
    carregarPermissoes();
    carregarCargos();
  }, []);

  const exibirErrosValidacao = (err, titulo = "Erro") => {
    const bodyErrors = err.response?.data?.erros?.body;

    if (bodyErrors) {
      const mensagens = Object.entries(bodyErrors)
        .map(([campo, msg]) => `<b>${campo}</b>: ${msg}`)
        .join("<br>");

      Swal.fire({
        title: titulo,
        html: mensagens,
        icon: "error",
      });
      return;
    }

    Swal.fire(titulo, "Erro inesperado ao processar requisicao.", "error");
  };

  const carregarCargos = async () => {
    try {
      const res = await api.get("/cargos");
      setCargos(res.data);
    } catch (err) {
      console.error("Erro ao carregar cargos", err);
    }
  };

  const carregarPermissoes = async () => {
    try {
      const res = await api.get("/permissoes");
      setPermissoes(res.data);
    } catch (err) {
      console.error("Erro ao carregar permissoes", err);
    }
  };

  const salvarCargo = async () => {
    if (!descricao || !permissaoSelecionada) {
      Swal.fire("Preencha todos os campos.");
      return;
    }

    try {
      const resCargo = await api.post("/cargo", { descricao });

      if (resCargo.status === 201 && resCargo.data.IDCargo) {
        const IDCargo = resCargo.data.IDCargo;
        const resPermissao = await api.post("/cargopermissao", {
          IDCargo,
          IDPermissao: permissaoSelecionada,
        });

        if (resPermissao.status === 201) {
          Swal.fire("Cargo e permissao cadastrados com sucesso!");
          setDescricao("");
          setPermissaoSelecionada(null);
          await carregarCargos();
          return;
        }

        Swal.fire("Erro ao vincular permissao.");
        return;
      }

      Swal.fire("Erro ao salvar cargo.");
    } catch (err) {
      console.error(err);
      exibirErrosValidacao(err, "Erro");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/cargo/${id}`);

      if (res.status === 204) {
        Swal.fire("Registro excluido com sucesso!");
        carregarCargos();
        return;
      }

      Swal.fire("Erro ao excluir.");
    } catch (err) {
      console.error(err);
      exibirErrosValidacao(err, "Erro");
    }
  };

  return (
    <div className="menu-container-menu">
      <MenuLateral />
      <main id="painel_principal_menu" align="center">
        <MenuSuperior userId={idFormatado} userName={nome} />
        <h4 style={{ width: "100%", textAlign: "center", paddingTop: "34px" }}>
          Cargos
        </h4>

        <div className="container">
          <div className="form-group">
            <label>Descricao do cargo</label>
            <input
              type="text"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Digite a descricao do cargo"
            />
          </div>

          <div className="form-group">
            <label>Permissao</label>
            <div className="radio-group">
              {permissoes.map((perm) => (
                <label
                  key={perm.IDPermissao}
                  className={`radio-option ${
                    permissaoSelecionada === perm.IDPermissao ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="permissao"
                    value={perm.IDPermissao}
                    checked={permissaoSelecionada === perm.IDPermissao}
                    onChange={() => setPermissaoSelecionada(perm.IDPermissao)}
                  />
                  {perm.descricao}
                </label>
              ))}
            </div>
          </div>

          <button onClick={salvarCargo}>Salvar cargo</button>
        </div>

        <GridRegistros
          registros={cargos}
          onDelete={handleDelete}
          chaveId="IDCargo"
          exibirEditar={false}
          ocultarCampos={["IDCargo_permissao"]}
        />
      </main>
    </div>
  );
};

export default CadastroCargo;
