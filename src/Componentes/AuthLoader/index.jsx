import React from 'react';
import { useAuthContext } from '../../context/authContext';
import './index.css';

const AuthLoader = ({ children }) => {
  const { authReady } = useAuthContext();

  if (!authReady) {
    return (
      <div className="auth-loader-overlay">
        <div className="spinner-border text-light" role="status" />
      </div>
    );
  }

  return children;
};

export default AuthLoader;
