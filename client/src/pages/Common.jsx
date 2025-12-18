import React from 'react';

const Placeholder = ({ title }) => (
    <div className="flex items-center justify-center h-full text-slate-400 text-xl">
        {title} Page (Under Construction)
    </div>
);

export const SearchPage = () => <Placeholder title="Search" />;
export const UsersPage = () => <Placeholder title="Users" />;
