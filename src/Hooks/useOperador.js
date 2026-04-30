import { useAuthContext } from "../context/authContext";

export const useOperador = () => {
  const { operador, isAdmin } = useAuthContext();

  return {
    operador,
    IDOperador: operador?.IDOperador ?? null,
    nome: operador?.nome ?? "",
    email: operador?.email ?? "",
    cargos: operador?.cargos ?? [],
    permissoes: operador?.cargos?.flatMap((c) => c.permissoes || []) ?? [],
    permissaoPrincipal: operador?.permissaoPrincipal ?? 0,
    isAdmin,
  };
};
