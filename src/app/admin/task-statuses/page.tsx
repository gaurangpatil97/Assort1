'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';

export default function TaskStatusesPage() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/task-statuses')
      .then(r => r.json())
      .then(data => setStatuses(data.statuses || data || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="p-lg space-y-lg max-w-4xl mx-auto">
        <div className="flex justify-between items-end">
           <div>
             <h2 className="text-h1 font-h1 text-on-surface">Task Statuses</h2>
             <p className="text-body-lg text-on-surface-variant">Customize the workflow pipeline stages for your company.</p>
           </div>
          <button className="px-lg py-sm bg-primary-container text-white rounded-lg font-label-md flex items-center gap-xs hover:shadow-lg active:scale-95 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="text-[20px]"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg> Add Status
          </button>
        </div>
        {loading ? (
          <div className="animate-pulse h-64 bg-surface-container-low rounded-xl"></div>
        ) : (
          <div className="space-y-sm">
             {statuses.length === 0 ? (
                 <div className="p-xl text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
                    No task statuses found.
                 </div>
             ) : statuses.map((s, idx) => (
               <div key={s.id} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex items-center justify-between cursor-move hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-md">
                     <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="text-outline cursor-grab"><path d="M360-160q-33 0-56.5-23.5T280-240q0-33 23.5-56.5T360-320q33 0 56.5 23.5T440-240q0 33-23.5 56.5T360-160Zm240 0q-33 0-56.5-23.5T520-240q0-33 23.5-56.5T600-320q33 0 56.5 23.5T680-240q0 33-23.5 56.5T600-160ZM360-400q-33 0-56.5-23.5T280-480q0-33 23.5-56.5T360-560q33 0 56.5 23.5T440-480q0 33-23.5 56.5T360-400Zm240 0q-33 0-56.5-23.5T520-480q0-33 23.5-56.5T600-560q33 0 56.5 23.5T680-480q0 33-23.5 56.5T600-400ZM360-640q-33 0-56.5-23.5T280-720q0-33 23.5-56.5T360-800q33 0 56.5 23.5T440-720q0 33-23.5 56.5T360-640Zm240 0q-33 0-56.5-23.5T520-720q0-33 23.5-56.5T600-800q33 0 56.5 23.5T680-720q0 33-23.5 56.5T600-640Z"/></svg>
                     <div className="w-4 h-4 rounded-full border border-outline-variant" style={{ backgroundColor: s.color || '#ccc' }}></div>
                     <span className="font-label-md text-on-surface">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-md opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="text-on-surface-variant hover:text-primary"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="text-[20px]"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>
                     <button className="text-on-surface-variant hover:text-error"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="text-[20px]"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button>
                  </div>
               </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
