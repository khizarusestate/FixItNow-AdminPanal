/**
 * FILE: adminpanel/src/Components/AdminSettings.jsx
 * 
 * Admin panel settings including maintenance mode
 */

import { useState } from 'react';
import { Settings, AlertTriangle, ArrowLeft } from 'lucide-react';
import MaintenanceMode from './MaintenanceMode';

export default function AdminSettings({ admin, onBack }) {
  const [activeTab, setActiveTab] = useState('maintenance');

  if (!admin?.isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-900 font-semibold">Access Denied</p>
        <p className="text-slate-600 text-sm">Only super admin can access settings</p>
        <button
          onClick={onBack}
          className="mt-4 text-orange-500 hover:text-orange-600 text-sm font-medium"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-200 rounded-lg transition"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <Settings size={28} className="text-orange-500" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Settings</h1>
          <p className="text-sm text-slate-600">Super admin control panel</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'maintenance'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          🔧 Maintenance Mode
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl p-6">
        {activeTab === 'maintenance' && <MaintenanceMode />}
      </div>
    </div>
  );
}
