import { useState, useEffect, useRef } from 'react';
import { Search, User as UserIcon, Heart, MessageCircle, PlusSquare, LogOut } from 'lucide-react';
import bitwinLogo from '../assets/Bitwin_logo_final.png';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
    onSearch: (query: string) => void;
    onLoginClick: () => void;
}

interface Suggestion {
    id: string;
    name: string;
    category: string;
}

export default function Header({ onSearch, onLoginClick }: HeaderProps) {
    const { user, logout } = useAuth();
    const [query, setQuery] = useState('');
    // ... rest of the component state ...
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            onSearch(''); // Reset main grit filter
            return;
        }

        // Immediately filter current suggestions to maintain Responsiveness
        setSuggestions(prev => prev.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase())
        ));

        const timer = setTimeout(() => {
            onSearch(query); // Trigger main grid filter
            fetch(`http://localhost:5001/api/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => {
                    setSuggestions(data);
                    if (data.length > 0) setShowDropdown(true);
                })
                .catch(err => console.error('Search error:', err));
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 py-4" dir="rtl">
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo Section - Right side in RTL */}
                <div className="flex items-center">
                    <img
                        src={bitwinLogo}
                        alt="BitWin Logo"
                        className="h-16 w-auto object-contain cursor-pointer"
                        onClick={() => window.location.href = '/'}
                    />
                </div>

                {/* Search Bar with Autocomplete - Center */}
                <div className="flex-1 max-w-2xl mx-12 relative group" ref={dropdownRef}>
                    <div className="relative">
                        <input
                            type="text"
                            dir="rtl"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => query.length >= 2 && setShowDropdown(true)}
                            placeholder="חיפוש חופשי..."
                            className="w-full bg-white border border-[#00AEEF] rounded-full py-2.5 px-6 pr-12 focus:ring-1 focus:ring-[#00AEEF] outline-none shadow-[0_2px_8px_rgba(0,174,239,0.1)] text-right"
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00AEEF] w-5 h-5 pointer-events-none" />
                    </div>

                    {showDropdown && suggestions.length > 0 && (
                        <div className="absolute top-full right-0 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="py-2">
                                {suggestions.map((item) => (
                                    <button
                                        key={item.id}
                                        className="w-full px-6 py-3 text-right hover:bg-[#00AEEF]/5 flex items-center justify-between transition-colors border-b border-gray-50 last:border-none"
                                        onClick={() => {
                                            setQuery(item.name);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <span className="text-xs text-gray-400 font-medium">בקטגוריה: {item.category}</span>
                                        <span className="text-gray-800 font-medium">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Icons - Left side in RTL */}
                <div className="flex items-center gap-6">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-[#1C4E80] hidden md:block">
                                היי, {user.firstName}
                            </span>
                            <button
                                onClick={logout}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="התנתקות"
                                aria-label="התנתקות"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-[#418EAB] text-white flex items-center justify-center font-bold shadow-sm">
                                {user.firstName.charAt(0)}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="p-2 text-[#1C4E80] hover:bg-gray-100 rounded-full transition-colors group relative"
                            title="התחברות"
                        >
                            <UserIcon className="w-6 h-6" />
                            <span className="absolute -bottom-8 right-1/2 translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                התחברות / הרשמה
                            </span>
                        </button>
                    )}
                    <button className="p-2 text-[#1C4E80] hover:bg-gray-100 rounded-full transition-colors">
                        <Heart className="w-6 h-6" />
                    </button>
                    <button className="p-2 text-[#1C4E80] hover:bg-gray-100 rounded-full transition-colors">
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    <button className="p-2 text-[#1C4E80] hover:bg-gray-100 rounded-full transition-colors">
                        <PlusSquare className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    );
}
