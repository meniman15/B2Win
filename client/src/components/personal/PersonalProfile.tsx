interface PersonalProfileProps {
  user: any;
}

export default function PersonalProfile({ user }: PersonalProfileProps) {
  return (
    <div className="p-8 max-w-3xl mx-auto" dir="rtl">
      {/* Profile Section */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-6">פרופיל אישי</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-2">שם פרטי</label>
            <input
              type="text"
              defaultValue={user?.firstName || ''}
              className="w-full border border-gray-300 rounded-full py-2.5 px-4 focus:ring-1 focus:ring-[#00AEEF] outline-none text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-2">שם משפחה</label>
            <input
              type="text"
              defaultValue={user?.lastName || ''}
              className="w-full border border-gray-300 rounded-full py-2.5 px-4 focus:ring-1 focus:ring-[#00AEEF] outline-none text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-2">מייל</label>
            <input
              type="email"
              defaultValue={user?.email || ''}
              className="w-full border border-gray-300 rounded-full py-2.5 px-4 focus:ring-1 focus:ring-[#00AEEF] outline-none text-gray-700 text-left"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-2">מספר טלפון</label>
            <input
              type="tel"
              defaultValue={user?.phone || ''}
              className="w-full border border-gray-300 rounded-full py-2.5 px-4 focus:ring-1 focus:ring-[#00AEEF] outline-none text-gray-700 text-left"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Unit Section */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-6">יחידה</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-2">תת-ארגון / יחידה</label>
            <input
              type="text"
              defaultValue={user?.subOrganization || ''}
              className="w-full border border-gray-300 rounded-full py-2.5 px-4 focus:ring-1 focus:ring-[#00AEEF] outline-none text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-2">מיקום</label>
            <input
              type="text"
              defaultValue={user?.organization || ''}
              className="w-full border border-gray-300 rounded-full py-2.5 px-4 focus:ring-1 focus:ring-[#00AEEF] outline-none text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 mt-12">
        <button className="px-10 py-2.5 bg-white border border-[#00AEEF] text-[#00AEEF] font-bold rounded-full hover:bg-[#00AEEF]/5 transition-colors shadow-sm">
          ביטול
        </button>
        <button className="px-10 py-2.5 bg-[#F39200] hover:bg-[#F39200]/90 text-white font-bold rounded-full transition-colors shadow-sm">
          שמירה
        </button>
      </div>
    </div>
  );
}
