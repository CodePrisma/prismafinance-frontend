import React from "react";
import { FaUserCircle, FaUserTie } from "react-icons/fa";
import "./styles.css";

const MenuSuperior = ({ userId, userName, cliente, removeMarginRight = false }) => {
  const navbarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    width: "100%",
    minWidth: 0,
    minHeight: "54px",
    padding: "0 0 16px",
    ...(removeMarginRight ? { marginRight: 0 } : null),
  };

  const textStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minWidth: 0,
    lineHeight: 1.2,
  };

  return (
    <div className="menu-superior" style={navbarStyle}>
      <div className="menu-superior__group">
        <FaUserCircle className="menu-superior__icon" />
        <div className="menu-superior__text" style={textStyle}>
          <span className="menu-superior__label">Operador</span>
          <span className="menu-superior__value">{userId} - {userName}</span>
        </div>
      </div>
      {cliente && (
        <div className="menu-superior__group menu-superior__group--cliente">
          <FaUserTie className="menu-superior__icon" />
          <div className="menu-superior__text" style={textStyle}>
            <span className="menu-superior__label">Contexto ativo</span>
            <span className="menu-superior__value">{cliente}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuSuperior;
