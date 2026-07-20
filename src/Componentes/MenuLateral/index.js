import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaChartLine,
  FaChartPie,
  FaClipboardList,
  FaCreditCard,
  FaFolderOpen,
  FaLayerGroup,
  FaPowerOff,
  FaTasks,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { useAuthContext } from "../../context/authContext";
import { useOperador } from "../../Hooks/useOperador";
import LogoSilvaNeves from "../../Imagens/logo-silva-neves.jpg";
import "./styles.css";

const MenuSection = ({ title, children, collapsible = false, defaultOpen = true, icon = null }) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  return (
    <li className={`menu-section ${collapsible ? "menu-section--collapsible" : ""}`}>
      {collapsible ? (
        <button
          type="button"
          className="menu-section__toggle"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          {icon && <span className="iconesMenu">{icon}</span>}
          <span>{title}</span>
          <b>{isExpanded ? "-" : "+"}</b>
        </button>
      ) : (
        <span>{title}</span>
      )}
      <div className={collapsible && !isExpanded ? "menu-section__content is-hidden" : "menu-section__content"}>
        {children}
      </div>
  </li>
  );
};

const MenuLateral = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const navigate = useNavigate();
  const {
    operador,
    authReady,
    logout,
    clientes,
    clienteAtivo,
    setClienteAtivo,
    isAdmin,
  } = useAuthContext();
  const { nome } = useOperador();

  useEffect(() => {
    if (authReady && !operador) {
      navigate("/");
    }
  }, [authReady, navigate, operador]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleViewportChange = (event) => {
      const mobileView = event.matches;
      setIsMobile(mobileView);
      setIsOpen(!mobileView);
    };

    handleViewportChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      document.body.classList.remove("menu-mobile-open");
      return;
    }

    document.body.classList.toggle("menu-mobile-open", isOpen);

    return () => {
      document.body.classList.remove("menu-mobile-open");
    };
  }, [isMobile, isOpen]);

  const handleNavigate = () => {
    if (isMobile) setIsOpen(false);
  };

  const handleClienteChange = async (event) => {
    const idCliente = Number(event.target.value);
    const cliente = clientes.find((item) => Number(item.IDcliente) === idCliente);
    await setClienteAtivo(cliente || null);
    if (cliente) navigate("/Menu");
  };

  const clienteRoutes = [
    { to: "/CadCategoria", label: "Categorias", icon: <FaLayerGroup /> },
    { to: "/CadGrupoDRE", label: "Grupos DRE", icon: <FaLayerGroup /> },
    { to: "/ContasBancarias", label: "Contas bancarias", icon: <FaCreditCard /> },
    { to: "/Lancamentos", label: "Lancamentos", icon: <FaClipboardList /> },
    { to: "/DRE", label: "DRE", icon: <FaChartLine /> },
    { to: "/Acoes", label: "Ações", icon: <FaTasks /> },
  ];

  return (
    <div className="menu-container">
      <button
        type="button"
        className={`menu-toggle ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
      >
        <span className="menu-icon"></span>
        <span className="menu-icon"></span>
        <span className="menu-icon"></span>
      </button>

      {isMobile && isOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <nav className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <img src={LogoSilvaNeves} alt="Silva & Neves Consultoria" />
        </div>

        <div className="client-context-box">
          <select value={clienteAtivo?.IDcliente || ""} onChange={handleClienteChange}>
            <option value="">Selecionar cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.IDcliente} value={cliente.IDcliente}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </div>

        <ul id="listamenu">
          <li>
            <NavLink to="/Menu" onClick={handleNavigate} className={({ isActive }) => (isActive ? "active" : undefined)}>
              <span className="iconesMenu"><FaChartPie /></span>
              Dashboard
            </NavLink>
          </li>

          {isAdmin && (
            <MenuSection title="Cadastros internos" collapsible defaultOpen={false} icon={<FaFolderOpen />}>
              <NavLink to="/CadastroCliente" onClick={handleNavigate} className={({ isActive }) => (isActive ? "active" : undefined)}>
                <span className="iconesMenu"><FaUsers /></span>
                Clientes
              </NavLink>
              <NavLink to="/CadOperador" onClick={handleNavigate} className={({ isActive }) => (isActive ? "active" : undefined)}>
                <span className="iconesMenu"><FaUserPlus /></span>
                Operadores
              </NavLink>
            </MenuSection>
          )}

          <MenuSection title="Cadastros" collapsible defaultOpen={false} icon={<FaLayerGroup />}>
            {clienteRoutes.slice(0, 3).map((item) => (
              <NavLink key={item.to} to={item.to} onClick={handleNavigate} className={({ isActive }) => (isActive ? "active" : undefined)}>
                <span className="iconesMenu">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </MenuSection>

          <MenuSection title="Operacao">
            {clienteRoutes.slice(3).map((item) => (
              <NavLink key={item.to} to={item.to} onClick={handleNavigate} className={({ isActive }) => (isActive ? "active" : undefined)}>
                <span className="iconesMenu">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </MenuSection>
        </ul>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user__avatar">
              {(nome || "SN").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{nome || "Operador"}</strong>
              <small>{isAdmin ? "Consultor admin" : "Operador"}</small>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={logout}>
            <FaPowerOff />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MenuLateral;
