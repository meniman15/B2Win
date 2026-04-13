

import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Building } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { User as UserType } from '../types';

// Move OrgOption interface to top-level scope
interface OrgOption {
    id: string;
    name: string;
}

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [view, setView] = useState<'login' | 'register'>('login');
    const { login, register, isLoading, error } = useAuth();

    // Org and suborg state
    const [orgs, setOrgs] = useState<OrgOption[]>([]);
    const [subOrgs, setSubOrgs] = useState<OrgOption[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
    const [selectedSubOrg, setSelectedSubOrg] = useState<OrgOption | null>(null);
    const [orgsLoading, setOrgsLoading] = useState(false);
    const [subOrgsLoading, setSubOrgsLoading] = useState(false);

    // Login fields
    const [fullName, setFullName] = useState('');
    const [loginPhone, setLoginPhone] = useState('');

    // Register fields
    const [formData, setFormData] = useState<UserType>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        isAdmin: false,
        organization: '',
        subOrganization: ''
    });
   
    // Fetch orgs on modal open
    useEffect(() => {
        if (isOpen) {
            setOrgsLoading(true);
            fetch(`${API_URL}/api/organizations`)
                .then(res => res.json())
                .then(data => {
                    setOrgs(Array.isArray(data) ? data.map((o: any) => ({ id: o.instance_id, name: o.name })) : []);
                })
                .finally(() => setOrgsLoading(false));
        }
    }, [isOpen]);

    // Fetch suborgs when org changes
    useEffect(() => {
        if (selectedOrg) {
            setSubOrgsLoading(true);
            const orgId = selectedOrg.id;
            fetch(`${API_URL}/api/organizations/${orgId}/suborganizations`)
                .then(res => res.json())
                .then(data => {
                    const suborgList = Array.isArray(data) ? data.map((o: any) => ({ id: o.instance_id, name: o.name })) : [];
                    setSubOrgs(suborgList);
                    // If no suborgs, clear selection
                    if (suborgList.length === 0) setSelectedSubOrg(null);
                })
                .finally(() => setSubOrgsLoading(false));
        } else {
            setSubOrgs([]);
            setSelectedSubOrg(null);
        }
    }, [selectedOrg]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login(fullName, loginPhone);
        if (success) onClose();
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        // Only send suborg if available and selected
        const regData: any = {
            ...formData,
            organization: {instance_id: selectedOrg?.id, text: selectedOrg?.name},
            isAdmin: formData.isAdmin ? 1 : 0,
            status:"פעיל"
        };
        if (subOrgs.length > 0 && selectedSubOrg) {
            regData.subOrganization = {instance_id: selectedSubOrg.id, text: selectedSubOrg.name};
        }
        const success = await register(regData);
        if (success) onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                        dir="rtl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
                        >
                            <X className="w-6 h-6 text-gray-400" />
                        </button>

                        <div className="flex flex-col items-center p-8">
                            {/* Illustration Area */}
                            <div className="w-full h-48 bg-blue-50 rounded-2xl mb-8 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#F39200] rounded-full blur-3xl" />
                                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#418EAB] rounded-full blur-3xl" />
                                </div>

                                {view === 'login' ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center">
                                            <User className="w-12 h-12 text-[#418EAB]" />
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-800">שנתחבר?</h2>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center">
                                            <Building className="w-12 h-12 text-[#F39200]" />
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-800">יצירת חשבון חדש</h2>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="w-full p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-center font-bold border border-red-100 italic">
                                    {error}
                                </div>
                            )}

                            {view === 'login' ? (
                                <form onSubmit={handleLogin} className="w-full space-y-5">
                                    <div className="relative">
                                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="שם מלא"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full h-14 pr-12 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all text-gray-800"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            placeholder="טלפון"
                                            value={loginPhone}
                                            onChange={(e) => setLoginPhone(e.target.value)}
                                            className="w-full h-14 pr-12 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all"
                                            dir="rtl"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-14 bg-[#F39200] text-white rounded-xl font-black text-xl shadow-lg shadow-orange-200 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isLoading && <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        <span>{isLoading ? 'מתחבר...' : 'התחברות'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('register')}
                                        className="w-full h-14 border-2 border-[#F39200] text-[#F39200] rounded-xl font-black text-xl hover:bg-orange-50 transition-all"
                                    >
                                        הרשמה
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleRegister} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative col-span-1">
                                        <input
                                            type="text"
                                            placeholder="שם פרטי"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full h-12 pr-4 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative col-span-1">
                                        <input
                                            type="text"
                                            placeholder="שם משפחה"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full h-12 pr-4 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative col-span-2">
                                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            placeholder="אימייל"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full h-12 pr-12 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all text-left placeholder:text-right"
                                            dir="ltr"
                                            required
                                        />
                                    </div>
                                    <div className="relative col-span-2">
                                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            placeholder="טלפון"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full h-12 pr-12 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all text-left placeholder:text-right"
                                            dir="ltr"
                                            required
                                        />
                                    </div>
                                    <div className="relative col-span-1">
                                        <Building className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            className="w-full h-12 pr-12 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all bg-white"
                                            value={selectedOrg && selectedOrg.id || ''}
                                            onChange={e => {
                                                const orgId = e.target.value;
                                                const org = orgs.find(o => o.id === orgId) || null;
                                                setSelectedOrg(org);
                                                setSelectedSubOrg(null); // Reset suborg when org changes
                                            }}
                                            required
                                            disabled={orgsLoading}
                                        >
                                            <option value="" disabled>{orgsLoading ? 'טוען ארגונים...' : 'בחר ארגון'}</option>
                                            {orgs.map(org => (
                                                <option key={org.id} value={org.id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative col-span-1">
                                        <select
                                            className="w-full h-12 pr-4 rounded-xl border-2 border-gray-100 focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all bg-white"
                                            value={selectedSubOrg && selectedSubOrg && typeof selectedSubOrg.id === 'string' ? selectedSubOrg.id : ''}
                                            onChange={e => {
                                                const subId = e.target.value;
                                                const sub = subOrgs.find(o => typeof o.id === 'object' ? o.id === subId : o.id === subId) || null;
                                                setSelectedSubOrg(sub);
                                            }}
                                            disabled={!selectedOrg || subOrgsLoading || subOrgs.length === 0}
                                            required={!!selectedOrg && subOrgs.length > 0}
                                        >
                                            {subOrgsLoading ? (
                                                <option value="" disabled>טוען תתי-ארגונים...</option>
                                            ) : subOrgs.length === 0 ? (
                                                <option value="" disabled>אין תתי ארגונים</option>
                                            ) : (
                                                <option value="" disabled>בחר תת-ארגון</option>
                                            )}
                                            {subOrgs.map(sub => (
                                                <option key={typeof sub.id === 'object' ? sub.id : sub.id} value={typeof sub.id === 'object' ? sub.id : sub.id}>{sub.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-3 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={formData.isAdmin}
                                                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                                                className="w-5 h-5 rounded border-2 border-gray-300 text-[#F39200] focus:ring-[#F39200] accent-[#F39200] cursor-pointer"
                                            />
                                            <span className="text-base font-bold text-gray-700">מנהל יחידתי</span>
                                        </label>
                                    </div>
                                    <div className="col-span-2 flex gap-4 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => setView('login')}
                                            className="flex-1 h-12 border-2 border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                        >
                                            חזור להתחברות
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-[2] h-12 bg-[#F39200] text-white rounded-xl font-black text-xl shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            <span>{isLoading ? 'יוצר...' : 'צור חשבון'}</span>
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
