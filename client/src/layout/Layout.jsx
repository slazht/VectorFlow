import React from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <div className="flex bg-background h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 relative">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
