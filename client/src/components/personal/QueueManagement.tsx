interface QueueManagementProps {
  user: any;
}

export default function QueueManagement({}: QueueManagementProps) {
  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-900">ניהול מתעניינים</h2>
      </div>
      
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8">
        <h3 className="text-xl font-bold text-gray-800 mb-2">אין עדיין מתעניינים</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          כאשר אנשים יביעו עניין פה יופיעו הבקשות שלהם.
        </p>
      </div>
    </div>
  );
}
