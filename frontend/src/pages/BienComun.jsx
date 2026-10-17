import React, { useEffect, useState } from "react";
import { HandHeart } from "lucide-react";
import api from "../api/client";
import { formatMoney } from "../utils/formatters";

export const BienComun = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/finanzas/bien-comun")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Error al cargar Bien Común", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
          <HandHeart className="w-7 h-7 text-emerald-600" />
          Bien Común
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Multas administradas como recurso común, fuera de la liquidación individual.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Cargando resumen de Bien Común...</div>
      ) : data && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-5 shadow-sm text-white">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Dinero total</p>
            <p className="text-2xl font-black mt-1">{formatMoney(data.total_dinero_total ?? data.total_multas_recaudadas)}</p>
            <p className="text-xs text-slate-300 mt-2">Incluye multas pagadas</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200/80 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Multas recaudadas</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatMoney(data.total_multas_recaudadas)}</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200/80 shadow-sm">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Intereses obtenidos</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{formatMoney(data.total_intereses_obtenidos)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Socios registrados</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {data.socios.map((socio) => (
                <div key={socio.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <p className="font-bold text-slate-800">{socio.nombre}</p>
                  <p className="font-black text-emerald-700">{formatMoney(socio.participacion)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
