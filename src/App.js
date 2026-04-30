import React from "react";
import Routes from "./routes";
import { AuthProvider } from "./context/authContext";
import AuthLoader from "./Componentes/AuthLoader";

export default function App() {
  return (
    <AuthProvider>
      <AuthLoader>
        <Routes />
      </AuthLoader>
    </AuthProvider>
  );
}
