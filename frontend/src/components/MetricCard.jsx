import React from "react";

export const MetricCard = ({ title, value, subtitle, icon: Icon, color = "emerald" }) => {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      gradient: "from-emerald-500 to-teal-600",
      text: "text-emerald-700",
    },
    blue: {
      bg: "bg-blue-50 text-blue-600 border-blue-100",
      gradient: "from-blue-500 to-indigo-600",
      text: "text-blue-700",
    },
    amber: {
      bg: "bg-amber-50 text-amber-600 border-amber-100",
      gradient: "from-amber-500 to-orange-600",
      text: "text-amber-700",
    },
    purple: {
      bg: "bg-purple-50 text-purple-600 border-purple-100",
      gradient: "from-purple-500 to-pink-600",
      text: "text-purple-700",
    },
    rose: {
      bg: "bg-rose-50 text-rose-600 border-rose-100",
      gradient: "from-rose-500 to-red-600",
      text: "text-rose-700",
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3.5 rounded-xl border ${scheme.bg}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};
