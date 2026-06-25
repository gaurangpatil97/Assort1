'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Shell from '@/components/layout/Shell';

export default function ProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${id}/profile`)
      .then(r => r.json())
      .then(data => setProfile(data.profile || data || {}))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Shell>
      <div className="p-lg space-y-lg max-w-5xl mx-auto mt-xl">
        {loading ? (
          <div className="animate-pulse space-y-lg">
             <div className="h-48 bg-surface-container-low rounded-xl"></div>
             <div className="h-64 bg-surface-container-low rounded-xl"></div>
          </div>
        ) : !profile ? (
          <div className="text-center p-xl font-body-lg text-on-surface-variant">Profile not found.</div>
        ) : (
          <>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden text-center p-xl relative">
               <div className="absolute top-0 left-0 w-full h-24 bg-primary-container/20 border-b border-primary-container/30"></div>
               <div className="relative z-10 w-24 h-24 mx-auto rounded-full bg-surface-container-lowest border-4 border-surface shadow-md flex items-center justify-center overflow-hidden mb-md text-primary">
                  {profile.avatarUrl ? (
                     <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="text-[48px] text-outline"><path d="M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q560-607 560-640t-23.5-56.5Q513-720 480-720t-56.5 23.5Q400-673 400-640t23.5 56.5Q447-560 480-560t56.5-23.5ZM480-640Zm0 400Z"/></svg>
                  )}
               </div>
               <h2 className="text-display font-display text-on-surface mb-xs">{profile.name}</h2>
               <p className="text-body-lg text-on-surface-variant mb-lg">{profile.designation || 'Employee'}</p>
               
               <div className="flex justify-center gap-xl border-t border-outline-variant pt-lg mt-md text-on-surface-variant font-body-md">
                  <div><span className="font-label-sm uppercase tracking-wider mr-xs">Department:</span> <span className="text-on-surface">{profile.department?.name || '-'}</span></div>
                  <div><span className="font-label-sm uppercase tracking-wider mr-xs">Manager:</span> <span className="text-on-surface">{profile.manager?.name || '-'}</span></div>
                  <div><span className="font-label-sm uppercase tracking-wider mr-xs">Joined:</span> <span className="text-on-surface">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</span></div>
               </div>
            </div>

            {profile.company?.showProfileStats && profile.stats && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant text-center shadow-sm">
                     <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-xs">Tasks Completed</p>
                     <p className="text-h2 font-h2 text-primary">{profile.stats.tasksCompleted || 0}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant text-center shadow-sm">
                     <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-xs">On Time %</p>
                     <p className="text-h2 font-h2 text-tertiary">{profile.stats.onTimePercentage || 0}%</p>
                  </div>
                  <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant text-center shadow-sm">
                     <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-xs">First Approval Rate</p>
                     <p className="text-h2 font-h2 text-secondary">{profile.stats.firstApprovalRate || 0}%</p>
                  </div>
               </div>
            )}

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
               <h3 className="text-h3 font-h3 mb-md text-on-surface">Past Completed Tasks</h3>
               {(!profile.completedTasks || profile.completedTasks.length === 0) ? (
                  <p className="text-on-surface-variant font-body-md p-md bg-surface-container-low rounded-lg text-center">No completed tasks yet.</p>
               ) : (
                  <ul className="space-y-sm">
                     {profile.completedTasks.map((t: any) => (
                        <li key={t.id} className="p-md bg-surface-container-low border border-outline-variant/50 rounded-lg flex justify-between items-center hover:border-primary-container transition-colors">
                           <div>
                              <p className="font-label-md text-on-surface">{t.title}</p>
                              <p className="text-xs text-on-surface-variant mt-xs">Completed: {new Date(t.completedAt || t.updatedAt).toLocaleDateString()}</p>
                           </div>
                           <span className="px-2 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded text-xs font-semibold tracking-wider">COMPLETED</span>
                        </li>
                     ))}
                  </ul>
               )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
