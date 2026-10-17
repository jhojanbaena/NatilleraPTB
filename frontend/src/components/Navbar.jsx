import React from "react";
import { Menu, ShieldCheck, RefreshCw } from "lucide-react";

export const Navbar = ({ onOpenSidebar, onRefresh, isRefreshing, title = "Sistema Natillera" }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 text-purple-600 hover:text-purple-800 rounded-xl hover:bg-purple-50 md:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-purple-800 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Actualizar datos"
            className="p-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Servidor Conectado</span>
        </div>
      </div>
    </header>
  );
};
