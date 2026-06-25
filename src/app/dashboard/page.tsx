'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { useAuth } from '@/context/AuthContext';

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/me')
      .then(r => r.json())
      .then(data => setStats(data.stats || data || {}))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="p-lg space-y-lg">
        <div className="flex justify-between items-end">
           <div>
             <h2 className="text-h1 font-h1 text-on-surface">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
             <p className="text-body-lg text-on-surface-variant">Here is your workflow summary.</p>
           </div>
        </div>

        {loading ? (
          <div className="animate-pulse grid grid-cols-2 lg:grid-cols-3 gap-lg">
             <div className="h-32 bg-surface-container-low rounded-xl"></div>
             <div className="h-32 bg-surface-container-low rounded-xl"></div>
             <div className="h-32 bg-surface-container-low rounded-xl"></div>
             <div className="h-32 bg-surface-container-low rounded-xl"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">Tasks Completed</span>
              <span className="text-display font-display text-primary">{stats.tasksCompleted || 0}</span>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">On Time %</span>
              <span className="text-display font-display text-tertiary">{stats.onTimePercentage || 100}%</span>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">First Approval Rate</span>
              <span className="text-display font-display text-secondary">{stats.firstApprovalRate || 100}%</span>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">Current Streak</span>
              <span className="text-display font-display text-on-surface">{stats.currentStreak || 0} days</span>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">Active Tasks</span>
              <span className="text-display font-display text-on-surface">{stats.activeTasks || 0}</span>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between bg-error-container/10 hover:shadow-md transition-shadow">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">Overdue Tasks</span>
              <span className="text-display font-display text-error">{stats.overdueTasks || 0}</span>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
