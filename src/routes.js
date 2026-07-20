import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Acoes from "./Pages/Acoes";
import CadCategoria from "./Pages/CadCategoria";
import CadGrupoDRE from "./Pages/CadGrupoDRE";
import CadOperador from "./Pages/CadOperador";
import CadastroCliente from "./Pages/CadastroCliente";
import ContasBancarias from "./Pages/ContasBancarias";
import DRE from "./Pages/DRE";
import Index from "./Pages/Index";
import Lancamentos from "./Pages/Lancamentos";
import Menu from "./Pages/Menu";
import { useAuthContext } from "./context/authContext";

export const routeNames = {
  index: "/",
  menu: "/Menu",
  cadastroCliente: "/CadastroCliente",
  cadOperador: "/CadOperador",
  cadCategoria: "/CadCategoria",
  cadGrupoDRE: "/CadGrupoDRE",
  contasBancarias: "/ContasBancarias",
  lancamentos: "/Lancamentos",
  dre: "/DRE",
  acoes: "/Acoes",
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authReady } = useAuthContext();
  const location = useLocation();

  if (!authReady) return <div>Carregando...</div>;

  if (!isAuthenticated && location.pathname !== routeNames.index) {
    return <Navigate to={routeNames.index} replace />;
  }

  return children;
};

const withProtection = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

const Rotas = () => (
  <BrowserRouter>
    <Routes>
      <Route path={routeNames.index} element={<Index />} />
      <Route path={routeNames.menu} element={withProtection(<Menu />)} />
      <Route path={routeNames.cadastroCliente} element={withProtection(<CadastroCliente />)} />
      <Route path={routeNames.cadOperador} element={withProtection(<CadOperador />)} />
      <Route path={routeNames.cadCategoria} element={withProtection(<CadCategoria />)} />
      <Route path={routeNames.cadGrupoDRE} element={withProtection(<CadGrupoDRE />)} />
      <Route path={routeNames.contasBancarias} element={withProtection(<ContasBancarias />)} />
      <Route path={routeNames.lancamentos} element={withProtection(<Lancamentos />)} />
      <Route path={routeNames.dre} element={withProtection(<DRE />)} />
      <Route path={routeNames.acoes} element={withProtection(<Acoes />)} />
      <Route path="*" element={<Navigate to={routeNames.index} replace />} />
    </Routes>
  </BrowserRouter>
);

export default Rotas;
