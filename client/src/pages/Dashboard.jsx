import React, { useEffect, useState } from 'react';
import { getStats } from '../api';
import StatsCard from '../components/StatsCard';
import { FileText, Database, CheckCircle, ShieldCheck, XCircle } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({ documents: 0, chunks: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStats()
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch stats", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-4 text-slate-500">Loading stats...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatsCard
                    title="Total Documents"
                    value={stats.documents || 0}
                    icon={FileText}
                    color="bg-white"
                />
                <StatsCard
                    title="Ready Documents"
                    value={stats.ready || 0}
                    icon={CheckCircle}
                    color="bg-white"
                    iconColor="text-green-500"
                />
                <StatsCard
                    title="Fixed Documents"
                    value={stats.fixed || 0}
                    icon={ShieldCheck}
                    color="bg-white"
                    iconColor="text-emerald-600"
                />
                <StatsCard
                    title="Not Fixed"
                    value={stats.not_fixed || 0}
                    icon={XCircle}
                    color="bg-white"
                    iconColor="text-rose-500"
                />
                <StatsCard
                    title="Total Chunks"
                    value={stats.chunks || 0}
                    icon={Database}
                    color="bg-white"
                    iconColor="text-violet-500"
                />
            </div>

            {/* Placeholder for future charts */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">System Activity</h3>
                <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    Activity Chart Placeholder
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
