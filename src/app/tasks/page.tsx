'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Shell from '@/components/layout/Shell';
import TaskCreationModal from '@/components/modals/TaskCreationModal';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTasks = () => {
    setLoading(true);
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => setTasks(data.tasks || data || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  const displayedTasks = tasks.filter(t => 
    activeTab === 'ACTIVE' 
      ? t.status !== 'COMPLETED' 
      : t.status === 'COMPLETED'
  );

  return (
    <Shell>
      <div className="px-lg py-xl">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <h2 className="font-h1 text-h1 text-on-surface">Tasks</h2>
            <p className="font-body-md text-on-surface-variant">Manage and track your assigned work.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="px-lg py-sm bg-primary-container text-white rounded-lg font-label-md flex items-center gap-xs hover:shadow-lg active:scale-95 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="text-[20px]"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg> Create Task
          </button>
        </div>

        <div className="flex gap-md border-b border-outline-variant mb-lg">
          <button 
            onClick={() => setActiveTab('ACTIVE')} 
            className={`px-md py-sm font-label-md border-b-2 transition-all ${activeTab === 'ACTIVE' ? 'border-primary-container text-primary-container' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            Active Tasks
          </button>
          <button 
            onClick={() => setActiveTab('COMPLETED')} 
            className={`px-md py-sm font-label-md border-b-2 transition-all ${activeTab === 'COMPLETED' ? 'border-primary-container text-primary-container' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            Completed Tasks
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse h-64 bg-surface-container-low rounded-xl"></div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/30 border-b border-outline-variant">
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Task Name</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Priority</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Assigned By</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Progress</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Deadline</th>
                  <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {displayedTasks.map(t => (
                  <tr key={t.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-lg py-md">
                      <Link href={`/tasks/${t.id}`} className="font-label-md text-on-surface hover:text-primary-container hover:underline block">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-lg py-md">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        t.priority === 'CRITICAL' ? 'bg-error-container text-error' :
                        t.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        t.priority === 'MEDIUM' ? 'bg-primary-fixed text-primary' :
                        'bg-surface-container-highest text-outline'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-lg py-md font-body-md text-on-surface">{t.createdBy?.name || '-'}</td>
                    <td className="px-lg py-md">
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                         <div className="bg-primary h-full transition-all duration-500" style={{ width: `${(t.completedMilestones / Math.max(t.totalMilestones, 1)) * 100}%` }}></div>
                      </div>
                      <span className="text-xs text-on-surface-variant mt-1 block">{t.completedMilestones} / {t.totalMilestones}</span>
                    </td>
                    <td className="px-lg py-md font-body-md text-on-surface-variant">
                      {new Date(t.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-lg py-md">
                      <span className="px-2 py-1 rounded-full bg-[#f2f3ff] text-[#434655] text-xs font-semibold">
                        {t.status?.name || t.state || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-lg py-xl text-center text-on-surface-variant">No tasks found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showCreateModal && (
        <TaskCreationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchTasks(); }}
        />
      )}
    </Shell>
  );
}
