import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, Search, Users, LogOut } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/data', label: 'Data', icon: Database },
        { path: '/search', label: 'Search', icon: Search },
        { path: '/users', label: 'Users', icon: Users },
    ];

    return (
        <aside className="w-64 bg-sidebar text-sidebar-foreground h-screen flex flex-col p-4 border-r border-gray-700">
            <div className="mb-8 p-2">
                <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">VectorFlow</h1>
            </div>
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                            ${isActive
                                ? 'bg-primary text-primary-foreground font-medium shadow-md'
                                : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'}
                        `}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-700 space-y-4">
                <button
                    onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                    }}
                    className="flex items-center gap-3 px-4 py-2 w-full text-left text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
                <div className="text-xs text-slate-500 px-2 mt-2">
                    &copy; 2024 DataAnalis
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
