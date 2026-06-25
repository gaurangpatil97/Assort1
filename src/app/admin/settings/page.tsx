'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({ name: '', timezone: 'UTC', showProfileStats: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/company/settings')
      .then(r => r.json())
      .then(data => setSettings(data.settings || data || {}))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/company/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      alert('Settings saved!');
    } catch (e) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="p-lg max-w-2xl mx-auto space-y-lg mt-xl">
        <div>
           <h2 className="text-h1 font-h1 text-on-surface">Company Settings</h2>
           <p className="text-body-md text-on-surface-variant">Update your organization's global preferences.</p>
        </div>

        {loading ? (
          <div className="animate-pulse h-64 bg-surface-container-low rounded-xl"></div>
        ) : (
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm space-y-lg">
            <div>
              <label className="block text-label-sm mb-xs text-on-surface-variant uppercase tracking-wider">Company Name</label>
              <input type="text" value={settings.name || ''} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm font-body-md text-on-surface focus:ring-2 focus:ring-primary-container outline-none transition-all" />
            </div>
            
            <div>
              <label className="block text-label-sm mb-xs text-on-surface-variant uppercase tracking-wider">Workspace Logo</label>
              <div className="flex items-center gap-md">
                 <div className="w-16 h-16 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="text-outline"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z"/></svg>
                 </div>
                 <button className="px-md py-sm border border-outline-variant rounded text-on-surface font-label-sm hover:bg-surface-container-low transition-colors">Upload New Logo</button>
              </div>
            </div>

            <div>
              <label className="block text-label-sm mb-xs text-on-surface-variant uppercase tracking-wider">Timezone</label>
              <select value={settings.timezone || 'UTC'} onChange={e => setSettings({...settings, timezone: e.target.value})} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm font-body-md text-on-surface focus:ring-2 focus:ring-primary-container outline-none transition-all cursor-pointer">
                <option value="UTC">UTC</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-sm pt-sm border-t border-outline-variant">
              <input type="checkbox" id="showStats" checked={settings.showProfileStats || false} onChange={e => setSettings({...settings, showProfileStats: e.target.checked})} className="w-4 h-4 accent-primary-container cursor-pointer" />
              <label htmlFor="showStats" className="text-body-md text-on-surface cursor-pointer select-none">Show public profile statistics to all employees</label>
            </div>
            
            <div className="pt-md">
               <button onClick={handleSave} disabled={saving} className="px-xl py-2.5 bg-primary-container text-white rounded-lg disabled:opacity-50 font-label-md hover:shadow-lg active:scale-95 transition-all">
                  {saving ? 'Saving...' : 'Save Settings'}
               </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
