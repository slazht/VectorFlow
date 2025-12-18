import React, { useEffect, useState } from 'react';
import { getDocuments, getChunks, updateChunk, updateDocument } from '../api';
import { FileText, Database, ChevronRight, UploadCloud, CheckCircle, Loader2, ShieldCheck, XCircle } from 'lucide-react';

const Data = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [chunks, setChunks] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [loadingChunks, setLoadingChunks] = useState(false);

    // Edit Modal State
    const [editingChunk, setEditingChunk] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 1
    });

    const [search, setSearch] = useState('');

    useEffect(() => {
        setLoadingDocs(true);
        // Debounce search in real app, but for now direct dependency
        const timer = setTimeout(() => {
            getDocuments(pagination.page, pagination.limit, search)
                .then(res => {
                    if (res.data.data && Array.isArray(res.data.data)) {
                        setDocuments(res.data.data);
                        setPagination(prev => ({ ...prev, ...res.data.pagination }));
                    } else {
                        setDocuments(res.data);
                    }
                    setLoadingDocs(false);
                })
                .catch(err => {
                    console.error("Failed to fetch documents", err);
                    setLoadingDocs(false);
                });
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [pagination.page, search]);

    // Handle search input change - resets page to 1
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleDocClick = (doc) => {
        setSelectedDoc(doc);
        setLoadingChunks(true);
        // Assuming chunk payload has file_name matching doc.file_name
        getChunks(doc.file_name)
            .then(res => {
                setChunks(res.data);
                setLoadingChunks(false);
            })
            .catch(err => {
                console.error("Failed to fetch chunks", err);
                setLoadingChunks(false);
            });
    };

    // Helper to get status icon
    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'ready':
                return <CheckCircle size={16} className="text-green-500" />;
            case 'processing':
                return <Loader2 size={16} className="text-amber-500 animate-spin" />;
            case 'uploaded':
                return <UploadCloud size={16} className="text-blue-500" />;
            default:
                return <FileText size={16} className="text-slate-400" />;
        }
    };

    const handleEditClick = (chunk) => {
        console.log("Editing chunk:", chunk);
        setEditingChunk(chunk);

        // Comprehensive extraction strategy
        let initialContent = '';
        const p = chunk.payload || {};

        // Try to find any valid string content
        const candidates = [p.original_text, p.content, p.text, p.page_content];
        for (const c of candidates) {
            if (c && typeof c === 'string' && c.trim().length > 0) {
                initialContent = c;
                break;
            }
        }

        // Check if payload itself is a string
        if (!initialContent && typeof p === 'string') {
            initialContent = p;
        }

        // Final fallback: Stringify the whole payload if we still have nothing
        if (!initialContent) {
            initialContent = JSON.stringify(p, null, 2);
        }

        setEditContent(initialContent);
    };

    const handleSaveChunk = () => {
        if (!editingChunk) return;

        console.log("Saving chunk:", editingChunk.id);
        setIsSaving(true);

        const updateData = {
            content: editContent,
            payload: { ...editingChunk.payload, content: editContent }
        };

        updateChunk(editingChunk.id, updateData)
            .then(() => {
                console.log("Chunk updated successfully!");
                setChunks(prev => prev.map(c =>
                    c.id === editingChunk.id
                        ? { ...c, payload: { ...c.payload, content: editContent, original_text: editContent } }
                        : c
                ));
                setEditingChunk(null);
                setIsSaving(false);
            })
            .catch(err => {
                console.error("Failed to update chunk", err);
                alert("Failed to save changes.");
                setIsSaving(false);
            });
    };

    const handleToggleFixed = () => {
        if (!selectedDoc) return;

        const newStatus = !selectedDoc.fixed; // Toggle
        const action = newStatus ? 'Mark as Fixed' : 'Unmark as Fixed';

        // Optional: reduce friction by removing confirm for unmarking? Or keep for safety.
        // User asked for capability, let's keep confirm to be safe but simple.
        // Actually, for a toggle, user might expect instant action. Let's try without confirm or simple confirm.
        // Let's keep it simple.

        updateDocument(selectedDoc._id, { fixed: newStatus })
            .then(res => {
                // Update local state
                setDocuments(prev => prev.map(d => d._id === selectedDoc._id ? { ...d, fixed: newStatus } : d));
                setSelectedDoc(prev => ({ ...prev, fixed: newStatus }));
            })
            .catch(err => {
                console.error("Failed to update status", err);
                alert("Failed to update document status.");
            });
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6 relative">
            {/* Modal Overlay */}
            {editingChunk && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-[95vw] h-[90vh] max-w-7xl flex flex-col rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <Database size={18} className="text-blue-500" />
                                Edit Chunk Content
                            </h3>
                            <button
                                onClick={() => setEditingChunk(null)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="flex-1 p-6 bg-slate-50/50 overflow-hidden flex flex-col gap-4">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full flex-1 p-6 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono text-base leading-relaxed text-slate-700 bg-white shadow-inner"
                                placeholder="Edit chunk content..."
                            />
                            {/* Debug Section for User Troubleshooting */}
                            <details className="bg-slate-100 rounded-lg border border-slate-200">
                                <summary className="px-4 py-2 text-xs font-medium text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors uppercase tracking-wider">
                                    Debug: View Raw Payload Data
                                </summary>
                                <pre className="p-4 text-xs font-mono text-slate-600 overflow-auto max-h-32 bg-slate-50 whitespace-pre-wrap">
                                    {JSON.stringify(editingChunk?.payload, null, 2)}
                                </pre>
                            </details>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingChunk(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveChunk}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Panel: Documents List */}
            <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <FileText size={18} /> Documents ({documents.length} / {pagination.total})
                    </h3>
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={search}
                        onChange={handleSearchChange}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingDocs ? (
                        <div className="p-4 text-center text-slate-400">Loading...</div>
                    ) : documents.map(doc => (
                        <button
                            key={doc._id}
                            onClick={() => handleDocClick(doc)}
                            className={`
                                w-full text-left px-4 py-3 rounded-lg text-sm transition-all
                                flex items-center justify-between group
                                ${selectedDoc?._id === doc._id
                                    ? 'bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-200'
                                    : 'hover:bg-slate-50 text-slate-600'}
                            `}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                {getStatusIcon(doc.status)}
                                {doc.fixed ? (
                                    <ShieldCheck size={16} className="text-emerald-500" />
                                ) : (
                                    <XCircle size={16} className="text-slate-300" />
                                )}
                                <span className="truncate">{doc.file_name}</span>
                            </div>
                            {selectedDoc?._id === doc._id && <ChevronRight size={16} />}
                        </button>
                    ))}
                </div>
                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-sm text-slate-600">
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1 || loadingDocs}
                        className="px-3 py-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Prev
                    </button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages || loadingDocs}
                        className="px-3 py-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Right Panel: Chunks List */}
            <div className="w-2/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Database size={18} />
                        {selectedDoc ? `Chunks for ${selectedDoc.file_name}` : 'Select a document'}
                    </h3>
                    {chunks.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                                {chunks.length} chunks
                            </span>
                            {selectedDoc && (
                                <button
                                    onClick={handleToggleFixed}
                                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${selectedDoc.fixed
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                >
                                    <ShieldCheck size={14} />
                                    {selectedDoc.fixed ? 'Fixed' : 'Mark as Fixed'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                    {!selectedDoc ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Select a document to view chunks
                        </div>
                    ) : loadingChunks ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Loading chunks...
                        </div>
                    ) : chunks.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            No chunks found for this document
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {chunks.map((chunk) => (
                                <div key={chunk.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1 rounded">ID: {chunk.id}</span>
                                        <button
                                            onClick={() => handleEditClick(chunk)}
                                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                                        {/* Prefer original_text, then content/text */}
                                        {chunk.payload?.original_text || chunk.payload?.content || chunk.payload?.text || JSON.stringify(chunk.payload)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Data;
