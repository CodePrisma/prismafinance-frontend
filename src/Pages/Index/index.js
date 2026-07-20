import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaChartLine,
  FaCoins,
  FaEye,
  FaEyeSlash,
  FaWallet,
} from "react-icons/fa";
import { useAuthContext } from "../../context/authContext";
import { useToastOnLoad } from "../../Hooks/useToastOnLoad";
import LogoSilvaNeves from "../../Imagens/logo-silva-neves.jpg";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";

const Index = () => {
  const navigate = useNavigate();
  useToastOnLoad();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuthContext();

  const presentationItems = [
    { icon: <FaWallet />, title: "Controle" },
    { icon: <FaCoins />, title: "Financeiro" },
    { icon: <FaChartLine />, title: "Indicadores" },
  ];

  const handleLogin = async () => {
    if (isLoggingIn) return;

    const msgEl = document.getElementById("msm_senha");
    if (msgEl) msgEl.style.display = "none";

    setIsLoggingIn(true);

    try {
      const result = await login(usuario, password);

      if (result.success) {
        navigate("/Menu");
        return;
      }

      if (msgEl) {
        msgEl.innerText = result.message || "Usuario e senha nao conferem.";
        msgEl.style.display = "block";
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="TelaLoginInicial">
      <div className="PainelLogin">
        <div className="login-shell">
          <section className="login-container">
            <div className="login-container__halo"></div>
            <div className="login-stack">
              <div className="login-showcase__hero">
                <div className="login-showcase__logoWrap">
                  <img
                    src={LogoSilvaNeves}
                    alt="Silva & Neves Consultoria"
                    className="login-brand-logo"
                  />
                </div>
              </div>

              <div className="login-auth-panel">
                <form
                  className="login-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleLogin();
                  }}
                >
                  <div className="login-form__header">
                    <div className="login-form__brandmark"></div>
                  </div>

                  <div className="form-group mb-3" align="left">
                    <label className="login-label" htmlFor="login-email">
                      Usuario
                    </label>
                    <input
                      id="login-email"
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="Digite seu usuario"
                      value={usuario}
                      onChange={(event) => setUsuario(event.target.value)}
                      disabled={isLoggingIn}
                    />
                  </div>

                  <div
                    className="form-group mb-3"
                    align="left"
                    style={{ position: "relative" }}
                  >
                    <label className="login-label" htmlFor="login-password">
                      Senha
                    </label>
                    <input
                      id="login-password"
                      type={passwordVisible ? "text" : "password"}
                      className="form-control form-control-lg"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isLoggingIn}
                      style={{ paddingRight: "3rem" }}
                    />
                    <span
                      onClick={() => setPasswordVisible((prev) => !prev)}
                      className="password-toggle"
                    >
                      {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 login-submit"
                    disabled={isLoggingIn}
                    aria-busy={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <><span className="login-spinner" aria-hidden="true" /> Entrando...</>
                    ) : (
                      <>Entrar <FaArrowRight /></>
                    )}
                  </button>

                  <label id="msm_senha" className="login-error"></label>
                </form>

                <div className="login-showcase__grid">
                  {presentationItems.map((item) => (
                    <article key={item.title} className="showcase-card">
                      <span className="showcase-card__icon">{item.icon}</span>
                      <div>
                        <strong>{item.title}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Index;


