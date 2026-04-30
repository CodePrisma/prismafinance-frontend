import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../Services/api";

const AuthContext = createContext();

const CLIENTE_ATIVO_KEY = "clienteAtivo";

const operadorIsAdmin = (operador) => {
  if (!operador) return false;
  return Boolean(
    operador.isAdmin ||
      Number(operador.permissaoPrincipal || 0) >= 3 ||
      operador.email === "adm@consultoria.com" ||
      operador.cargos?.some((cargo) =>
        String(cargo.descricao || cargo.Descricao || "").toLowerCase().includes("admin")
      )
  );
};

const parseStoredCliente = () => {
  try {
    const stored = localStorage.getItem(CLIENTE_ATIVO_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(CLIENTE_ATIVO_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [operador, setOperador] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteAtivo, setClienteAtivoState] = useState(parseStoredCliente);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const logout = useCallback((showMessage = false) => {
    setOperador(null);
    setClientes([]);
    setClienteAtivoState(null);
    setIsAuthenticated(false);
    localStorage.clear();

    if (showMessage) {
      localStorage.setItem(
        "toastLogout",
        "Sua sessao expirou. Por favor, faca login novamente."
      );
    }

    window.location.href = "/";
  }, []);

  const setClienteAtivo = useCallback(async (cliente) => {
    if (!cliente) {
      localStorage.removeItem(CLIENTE_ATIVO_KEY);
      setClienteAtivoState(null);
      return null;
    }

    const idCliente = cliente.IDcliente || cliente.idcliente || cliente.id;
    if (!idCliente) return null;

    try {
      await api.post("/me/cliente-ativo", { IDcliente: Number(idCliente) });
    } catch (error) {
      console.warn("Nao foi possivel confirmar cliente ativo na API", error);
    }

    const normalizado = {
      ...cliente,
      IDcliente: Number(idCliente),
      nome: cliente.nome || cliente.razao_social || `Cliente ${idCliente}`,
    };

    localStorage.setItem(CLIENTE_ATIVO_KEY, JSON.stringify(normalizado));
    setClienteAtivoState(normalizado);
    return normalizado;
  }, []);

  const carregarSessao = useCallback(async () => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setAuthReady(true);
      return;
    }

    try {
      const response = await api.get("/me");
      const operadorApi = response.data?.operador || null;
      const clientesApi = response.data?.clientes || [];

      setOperador(operadorApi);
      setClientes(clientesApi);
      setIsAuthenticated(Boolean(operadorApi));

      const adminAtual = operadorIsAdmin(operadorApi);
      const armazenado = parseStoredCliente();
      const clienteValido = armazenado
        ? clientesApi.find((cliente) => Number(cliente.IDcliente) === Number(armazenado.IDcliente))
        : null;

      if (clienteValido) {
        setClienteAtivoState(clienteValido);
        localStorage.setItem(CLIENTE_ATIVO_KEY, JSON.stringify(clienteValido));
      } else if (!adminAtual && clientesApi.length === 1) {
        await setClienteAtivo(clientesApi[0]);
      } else if (!clientesApi.length) {
        localStorage.removeItem(CLIENTE_ATIVO_KEY);
        setClienteAtivoState(null);
      }
    } catch (err) {
      console.error("Erro ao carregar sessao", err);
      logout(true);
      return;
    } finally {
      setAuthReady(true);
    }
  }, [logout, setClienteAtivo]);

  useEffect(() => {
    carregarSessao();
  }, [carregarSessao]);

  const login = async (email, senha) => {
    try {
      const response = await api.post("/auth/login", { email, senha });
      const { token, refreshToken } = response.data || {};

      if (!token) {
        return { success: false, message: "Token nao retornado pela API." };
      }

      localStorage.setItem("authToken", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      const me = await api.get("/me");
      const operadorApi = me.data?.operador || null;
      const clientesApi = me.data?.clientes || [];

      setOperador(operadorApi);
      setClientes(clientesApi);
      setIsAuthenticated(Boolean(operadorApi));

      const adminAtual = operadorIsAdmin(operadorApi);

      if (!adminAtual && clientesApi.length === 1) {
        await setClienteAtivo(clientesApi[0]);
      } else {
        localStorage.removeItem(CLIENTE_ATIVO_KEY);
        setClienteAtivoState(null);
      }

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.errors?.default ||
        error.response?.data?.message ||
        "Usuario e senha nao conferem.";
      return { success: false, message };
    }
  };

  const refreshClientes = async () => {
    const response = await api.get("/me/clientes");
    setClientes(response.data || []);
    return response.data || [];
  };

  const isAdmin = useMemo(() => {
    if (!operador) return false;
    return operadorIsAdmin(operador);
  }, [operador]);

  return (
    <AuthContext.Provider
      value={{
        operador,
        clientes,
        clienteAtivo,
        isAdmin,
        isAuthenticated,
        authReady,
        login,
        logout,
        setClienteAtivo,
        refreshClientes,
        carregarSessao,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
