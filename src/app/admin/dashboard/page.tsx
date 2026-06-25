'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/me').then(r => r.json()),
      fetch('/api/tasks?state=OVERDUE').then(r => r.json())
    ]).then(([dashData, tasksData]) => {
      setDashboard(dashData);
      setOverdueTasks(tasksData.tasks || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <Shell>
      <section className="p-lg space-y-lg">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface">Admin Dashboard</h2>
          <p className="font-body-lg text-on-surface-variant">Company overview and overdue items.</p>
        </div>
        
        {loading ? (
          <div className="animate-pulse h-64 bg-surface-container-low rounded-xl"></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-lg">
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <p className="font-body-md text-on-surface-variant">Total Users</p>
                <h3 className="font-display text-display text-on-surface">{dashboard?.totalUsers || 0}</h3>
              </div>
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <p className="font-body-md text-on-surface-variant">Active Tasks</p>
                <h3 className="font-display text-display text-on-surface">{dashboard?.activeTasks || 0}</h3>
              </div>
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <p className="font-body-md text-on-surface-variant">Overdue Tasks</p>
                <h3 className="font-display text-display text-error">{dashboard?.overdueTasks || overdueTasks.length}</h3>
              </div>
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <p className="font-body-md text-on-surface-variant">Departments</p>
                <h3 className="font-display text-display text-on-surface">{dashboard?.totalDepartments || 0}</h3>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg">
              <h3 className="font-h3 text-h3 text-on-surface mb-md">Critical Overdue Tasks</h3>
              {overdueTasks.length === 0 ? (
                <p className="text-on-surface-variant">No overdue tasks.</p>
              ) : (
                <ul className="space-y-sm">
                  {overdueTasks.map(t => (
                    <li key={t.id} className="p-md bg-error-container text-on-error-container rounded-lg border border-error">
                      <strong>{t.title}</strong> - Due: {new Date(t.dueDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg">
              <h3 className="font-h3 text-h3 text-on-surface mb-md">Recent Activity</h3>
              <p className="text-on-surface-variant italic">Activity feed coming soon...</p>
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}
