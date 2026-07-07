'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Shell from '@/components/layout/Shell';

export default function TeamPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/team')
      .then(r => r.json())
      .then(data => setTeam(data.team || data || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="px-lg py-xl">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <h2 className="font-h1 text-h1 text-on-surface">Team Overview</h2>
            <p className="font-body-md text-on-surface-variant">Monitor your direct reports' workload and progress.</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse h-64 bg-surface-container-low rounded-xl"></div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/30 border-b border-outline-variant">
                    <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Team Member</th>
                    <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider text-center">Active Tasks</th>
                    <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider w-1/4">Overall Progress</th>
                    <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider">Next Deadline</th>
                    <th className="px-lg py-md font-label-md text-on-surface-variant uppercase tracking-wider text-right">On Time %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {team.map(member => (
                    <tr key={member.id || member.email || Math.random()} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-lg py-md">
                        <Link href={`/profile/${member.id}`} className="flex items-center gap-md group-hover:text-primary transition-colors">
                           <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold shadow-sm">
                              {member.name.charAt(0)}
                           </div>
                           <div>
                              <div className="font-label-md">{member.name}</div>
                              <div className="font-body-sm text-on-surface-variant">{member.designation || 'Member'}</div>
                           </div>
                        </Link>
                      </td>
                      <td className="px-lg py-md text-center font-h3 text-on-surface">{member.activeTasks || 0}</td>
                      <td className="px-lg py-md">
                         <div className="flex items-center gap-sm">
                            <div className="flex-1 bg-surface-container-high h-2 rounded-full overflow-hidden">
                               <div className="bg-tertiary h-full transition-all duration-700" style={{ width: `${member.overallProgress || 0}%` }}></div>
                            </div>
                            <span className="text-xs text-on-surface-variant font-semibold w-8 text-right">{member.overallProgress || 0}%</span>
                         </div>
                      </td>
                      <td className="px-lg py-md font-body-md text-on-surface-variant">
                        {member.nextDeadline ? new Date(member.nextDeadline).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-lg py-md text-right">
                         <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            (member.onTimePercentage || 0) >= 90 ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' :
                            (member.onTimePercentage || 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-error-container text-error'
                         }`}>
                            {member.onTimePercentage || 0}%
                         </span>
                      </td>
                    </tr>
                  ))}
                  {team.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant font-body-md bg-surface-container-lowest">No team members found reporting to you.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
