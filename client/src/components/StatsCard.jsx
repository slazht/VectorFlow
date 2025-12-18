import React from 'react';

const StatsCard = ({ title, value, icon: Icon, color = "bg-white", iconColor = "text-slate-600" }) => {
    return (
        <div className={`${color} p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4`}>
            <div className={`p-4 rounded-full bg-slate-100 ${iconColor}`}>
                {Icon && <Icon size={24} />}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            </div>
        </div>
    );
};

export default StatsCard;
