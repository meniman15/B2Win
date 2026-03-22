import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface PersonalProfileProps {
  user: any;
}

export default function PersonalProfile({ user }: PersonalProfileProps) {
  const { updateUser } = useAuth() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [subOrgs, setSubOrgs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subOrganization: user?.subOrganization || '',
    subOrganizationId: user?.subOrganizationId || '',
    organization: user?.organization || '',
    organizationId: user?.organizationId || ''
  });

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/organizations');
        if (res.ok) {
          const data = await res.json();
          setOrgs(data);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };
    if (isEditing) fetchOrgs();
  }, [isEditing]);

  useEffect(() => {
    const fetchSubOrgs = async () => {
      if (!formData.organizationId) {
        setSubOrgs([]);
        return;
      }
      try {
        const res = await fetch(`http://localhost:5001/api/organizations/${formData.organizationId}/suborganizations`);
        if (res.ok) {
          const data = await res.json();
          setSubOrgs(data);
        }
      } catch (error) {
        console.error('Error fetching sub-organizations:', error);
      }
    };
    if (isEditing) fetchSubOrgs();
  }, [formData.organizationId, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'organizationId') {
      const selectedOrg = orgs.find(o => o.instance_id === value);
      setFormData(prev => ({ 
        ...prev, 
        organizationId: value,
        organization: selectedOrg?.name || '',
        subOrganizationId: '',
        subOrganization: ''
      }));
    } else if (name === 'subOrganizationId') {
      const selectedSubOrg = subOrgs.find(s => s.instance_id === value);
      setFormData(prev => ({ 
        ...prev, 
        subOrganizationId: value,
        subOrganization: selectedSubOrg?.name || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCancel = () => {
    // Reset to initial user data
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      subOrganization: user?.subOrganization || '',
      subOrganizationId: user?.subOrganizationId || '',
      organization: user?.organization || '',
      organizationId: user?.organizationId || ''
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:5001/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, data: formData })
      });
      if (!res.ok) throw new Error('Failed to update profile');

      if (updateUser) {
        updateUser(formData);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('שגיאה בשמירת הפרופיל. אנא נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto" dir="rtl">
      {/* Profile Section */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-900">פרופיל אישי</h2>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <Pencil className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1">שם פרטי</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`w-full border rounded-full py-2.5 outline-none transition-all ${isEditing ? 'px-4 border-gray-300 focus:ring-1 focus:ring-[#00AEEF] bg-white text-gray-700' : 'px-0 border-transparent bg-transparent text-gray-900 font-bold'}`}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1">שם משפחה</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`w-full border rounded-full py-2.5 outline-none transition-all ${isEditing ? 'px-4 border-gray-300 focus:ring-1 focus:ring-[#00AEEF] bg-white text-gray-700' : 'px-0 border-transparent bg-transparent text-gray-900 font-bold'}`}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1">מייל</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`w-full border rounded-full py-2.5 outline-none text-right transition-all ${isEditing ? 'px-4 border-gray-300 focus:ring-1 focus:ring-[#00AEEF] bg-white text-gray-700' : 'px-0 border-transparent bg-transparent text-gray-900 font-bold'}`}
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1">מספר טלפון</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`w-full border rounded-full py-2.5 outline-none text-right transition-all ${isEditing ? 'px-4 border-gray-300 focus:ring-1 focus:ring-[#00AEEF] bg-white text-gray-700' : 'px-0 border-transparent bg-transparent text-gray-900 font-bold'}`}
              dir="rtl"
            />
          </div>
        </div>
      </div>

      {/* Unit Section */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-6">יחידה</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1">ארגון</label>
            {isEditing ? (
              <select
                name="organizationId"
                value={formData.organizationId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-full py-2.5 px-4 outline-none focus:ring-1 focus:ring-[#00AEEF] bg-white text-gray-700"
              >
                <option value="">בחר ארגון</option>
                {orgs.map(org => (
                  <option key={org.instance_id} value={org.instance_id}>{org.name}</option>
                ))}
              </select>
            ) : (
              <div className="py-2.5 px-0 text-gray-900 font-bold border border-transparent">
                {formData.organization}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1">תת-ארגון / יחידה</label>
            {isEditing ? (
              <select
                name="subOrganizationId"
                value={formData.subOrganizationId}
                onChange={handleChange}
                disabled={!formData.organizationId}
                className="w-full border border-gray-300 rounded-full py-2.5 px-4 outline-none focus:ring-1 focus:ring-[#00AEEF] bg-white text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">בחר תת-ארגון</option>
                {subOrgs.map(subOrg => (
                  <option key={subOrg.instance_id} value={subOrg.instance_id}>{subOrg.name}</option>
                ))}
              </select>
            ) : (
              <div className="py-2.5 px-0 text-gray-900 font-bold border border-transparent">
                {formData.subOrganization}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex items-center justify-center gap-4 mt-12">
          <button onClick={handleCancel} className="px-10 py-2.5 bg-white border border-[#00AEEF] text-[#00AEEF] font-bold rounded-full hover:bg-[#00AEEF]/5 transition-colors shadow-sm">
            ביטול
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-10 py-2.5 bg-[#F39200] hover:bg-[#F39200]/90 text-white font-bold rounded-full transition-colors shadow-sm disabled:opacity-50">
            {isSaving ? 'שומר...' : 'שמירה'}
          </button>
        </div>
      )}
    </div>
  );
}
