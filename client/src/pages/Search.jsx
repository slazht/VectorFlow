import React, { useState } from 'react';
import { Search, Zap, Type, Loader2, FileText } from 'lucide-react';
import api from '../api';

const SearchPage = () => {
    const [searchType, setSearchType] = useState('vector'); // 'text' | 'vector'
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [topK, setTopK] = useState(20);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setResults([]);

        try {
            const endpoint = searchType === 'vector' ? '/search/vector' : '/search/text';
            const res = await api.post(endpoint, { query, limit: topK });
            setResults(res.data);
        } catch (err) {
            console.error("Search failed:", err);
            // alert("Search failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            {/* Left Sidebar: Search Controls */}
            <div className="w-1/3 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Search size={20} className="text-blue-500" />
                        Search
                    </h2>

                    {/* Search Type Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                        <button
                            onClick={() => setSearchType('text')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${searchType === 'text'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Type size={16} />
                            Text Search
                        </button>
                        <button
                            onClick={() => setSearchType('vector')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${searchType === 'vector'
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Zap size={16} />
                            Vector Search
                        </button>
                    </div>

                    {/* Top-K Slider */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-600 mb-2 flex justify-between">
                            <span>Top-K Results</span>
                            <span className="text-blue-600 font-bold">{topK}</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={topK}
                            onChange={(e) => setTopK(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>1</span>
                            <span>100</span>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">
                                {searchType === 'text' ? 'Keyword Query' : 'Semantic Query'}
                            </label>
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full h-32 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-slate-700 placeholder-slate-400"
                                placeholder={searchType === 'text' ? "Enter keywords..." : "Describe what you're looking for..."}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className={`
                                w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors
                                ${searchType === 'vector'
                                    ? 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-500'
                                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Panel: Results */}
            <div className="w-2/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Results</h3>
                    {results.length > 0 && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                            {results.length} matches
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 size={32} className={`animate-spin ${searchType === 'vector' ? 'text-violet-500' : 'text-blue-500'}`} />
                            <p>Searching database...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Search size={32} className="opacity-20" />
                            <p>No results found. Try a different query.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {results.map((item, idx) => (
                                <SearchResultCard key={idx} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SearchResultCard = ({ item }) => {
    const [expanded, setExpanded] = React.useState(false);
    const content = item.payload?.content || item.payload?.original_text || JSON.stringify(item.payload);
    const isLong = content.length > 300;

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                        {item.payload?.file_name || 'Unknown File'}
                    </span>
                    {item.score && (
                        <div className="flex items-center gap-2">
                            {/* Score Badge */}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${item.score > 0.8 ? 'bg-green-100 text-green-700' :
                                item.score > 0.7 ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                {item.score.toFixed(4)}
                            </span>
                            {/* Score Progress Bar (Only for vector search/when score exists) */}
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${item.score > 0.8 ? 'bg-green-500' :
                                        item.score > 0.7 ? 'bg-amber-500' :
                                            'bg-slate-400'
                                        }`}
                                    style={{ width: `${item.score * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-sm text-slate-700 leading-relaxed">
                <p className={`${expanded ? '' : 'line-clamp-4'} font-mono`}>
                    {content}
                </p>
                {isLong && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 focus:outline-none"
                    >
                        {expanded ? 'Show Less' : 'Show More'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
