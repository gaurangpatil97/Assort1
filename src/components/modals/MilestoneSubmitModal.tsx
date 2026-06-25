'use client';

import { useState } from 'react';

export default function MilestoneSubmitModal({ milestoneId, onClose, onSuccess }: { milestoneId: string, onClose: () => void, onSuccess: () => void }) {
   const [notes, setNotes] = useState('');
   const [loading, setLoading] = useState(false);

   const handleSubmit = async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/milestones/${milestoneId}/submit`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
         });
         if (!res.ok) throw new Error('Failed to submit milestone');
         onSuccess();
      } catch (e) {
         alert('Error submitting milestone');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-md">
         <div className="bg-surface p-xl rounded-xl w-full max-w-lg shadow-xl border border-outline-variant">
            <h2 className="text-h2 font-display text-on-surface mb-md">Submit Milestone</h2>
            <div className="space-y-md">
               <div>
                  <label className="block text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider">Submission Notes (Optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm focus:ring-2 focus:ring-primary-container outline-none" placeholder="Provide context or links for review..."></textarea>
               </div>
               <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
                  <button onClick={onClose} disabled={loading} className="px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low font-label-md transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleSubmit} disabled={loading} className="px-lg py-sm rounded-lg bg-primary-container text-white font-label-md hover:shadow-lg transition-all disabled:opacity-50">
                     {loading ? 'Submitting...' : 'Submit for Review'}
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}
