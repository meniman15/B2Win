import { User, Heart, LayoutList, HelpCircle, FileText, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface PersonalSidebarProps {
  user: any;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export default function PersonalSidebar({ user, activeTab, onSelectTab }: PersonalSidebarProps) {
  const { logout } = useAuth();

  const navItems = [
    { id: 'profile', label: 'פרופיל אישי', icon: User },
    { id: 'interested', label: 'מוצרים שהתעניינת בהם', icon: Heart },
    { id: 'posted', label: 'מודעות שפרסמת', icon: LayoutList }
  ];

  return (
    <aside className="w-72 bg-[#B5D5DF] rounded-2xl overflow-hidden flex-shrink-0" dir="rtl">
      {/* User Info Header */}
      <div className="p-8 text-center border-b border-[#92C4D6]">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-[#1C4E80] text-white flex items-center justify-center font-bold text-xl ml-4">
            {(user?.firstName || '?').charAt(0)}
          </div>
          <div className="flex-1 text-right">
            <h2 className="text-xl font-black text-gray-900">{user?.firstName || 'משתמש'} {user?.lastName || ''}</h2>
            <p className="text-sm text-gray-700 font-medium">{[user?.organization, user?.subOrganization].filter(Boolean).join(' - ') || 'יחידה לא ידועה'}</p>
          </div>

        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-2 hover:bg-[#92C4D6]/30 transition-colors text-right relative ${isActive ? 'font-bold' : 'font-normal'
                }`}
            >
              <Icon
                className={`w-7 h-7 text-[#418EAB] transition-all`}
                strokeWidth={1.5}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className="text-xl text-gray-900">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Support Section */}
      <div className="mt-6 px-4 pb-8">
        <h3 className="text-2xl font-black text-black mb-4 px-4 text-right">תמיכה</h3>
        <nav className="space-y-2">
          <button className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#92C4D6]/30 transition-colors text-right opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4">
              <HelpCircle className="w-7 h-7 text-[#418EAB]" strokeWidth={1.5} />
              <span className="text-xl text-gray-900">צור קשר</span>
            </div>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">בבנייה</span>
          </button>
          <button className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#92C4D6]/30 transition-colors text-right opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4">
              <FileText className="w-7 h-7 text-[#418EAB]" strokeWidth={1.5} />
              <span className="text-xl text-gray-900">תקנון</span>
            </div>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">בבנייה</span>
          </button>
          <button className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#92C4D6]/30 transition-colors text-right opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-7 h-7 text-[#418EAB]" strokeWidth={1.5} />
              <span className="text-xl text-gray-900">מדיניות פרטיות</span>
            </div>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">בבנייה</span>
          </button>
          <button
            className="w-full flex items-center gap-4 px-4 py-2 hover:bg-[#92C4D6]/30 transition-colors mt-6 text-right"
            onClick={logout}
          >
            <LogOut className="w-7 h-7 text-red-500" strokeWidth={1.5} />
            <span className="text-xl text-red-500">התנתקות</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
