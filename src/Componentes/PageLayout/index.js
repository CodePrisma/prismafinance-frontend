import React from "react";
import MenuLateral from "../MenuLateral";
import MenuSuperior from "../MenuSuperior";
import { useAuthContext } from "../../context/authContext";
import { useOperador } from "../../Hooks/useOperador";
import "./styles.css";

const PageLayout = ({ title, eyebrow, subtitle, actions, children, requireCliente = true }) => {
  const { clienteAtivo } = useAuthContext();
  const { IDOperador, nome } = useOperador();
  const idFormatado = String(IDOperador ?? "").padStart(6, "0");

  return (
    <div className="menu-container-menu">
      <MenuLateral />
      <main id="painel_principal_menu">
        <div className="page-shell app-page-shell">
          <MenuSuperior
            userId={idFormatado}
            userName={nome || "Operador"}
            cliente={clienteAtivo?.nome}
            removeMarginRight
          />

          <header className="page-header-card app-page-header">
            <div>
              {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </header>

          {requireCliente && !clienteAtivo ? (
            <section className="empty-state-card">
              <strong>Selecione um cliente para continuar</strong>
              <span>O admin pode escolher qualquer cliente no seletor do menu lateral. Operadores comuns entram direto no cliente vinculado.</span>
            </section>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
};

export default PageLayout;
