import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Socios } from "./pages/Socios";
import { Prestamos } from "./pages/Prestamos";
import { ActividadesRifas } from "./pages/ActividadesRifas";
import { Liquidacion } from "./pages/Liquidacion";
import { Historial } from "./pages/Historial";
import { BienComun } from "./pages/BienComun";

const pageTitles = {
  "/": "Dashboard — Lobby Financiero",
  "/socios": "Socios y Estado de Cuenta",
  "/prestamos": "Préstamos y Cartera",
  "/actividades-rifas": "Eventos, Rifas y Reuniones",
  "/liquidacion": "Liquidación Anual y Utilidades",
  "/historial": "Historial Global de Movimientos",
  "/bien-comun": "Bien Común",
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const path = window.location.pathname;
  const title = pageTitles[path] || "Sistema Natillera";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 md:pl-64 min-w-0">
        <Navbar
          onOpenSidebar={() => setSidebarOpen(true)}
          title={title}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <footer className="text-center py-4 text-[11px] text-slate-400 border-t border-slate-200/80">
          Sistema de Gestión Integral Natillera · Backend: FastAPI + SQLAlchemy · Frontend: React + Tailwind CSS
        </footer>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/socios"
            element={
              <ProtectedRoute>
                <Layout><Socios /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos"
            element={
              <ProtectedRoute>
                <Layout><Prestamos /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/actividades-rifas"
            element={
              <ProtectedRoute>
                <Layout><ActividadesRifas /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/liquidacion"
            element={
              <ProtectedRoute>
                <Layout><Liquidacion /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/historial"
            element={
              <ProtectedRoute>
                <Layout><Historial /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bien-comun"
            element={
              <ProtectedRoute>
                <Layout><BienComun /></Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
