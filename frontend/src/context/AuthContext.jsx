import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        try {
          const res = await api.get("/auth/me");
          setUser(res.data);
        } catch (err) {
          console.error("Token inválido o expirado", err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post("/auth/login-json", { username, password });
    const { access_token } = res.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    
    // Obtener perfil inmediatamente
    const userRes = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(userRes.data);
    return userRes.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
