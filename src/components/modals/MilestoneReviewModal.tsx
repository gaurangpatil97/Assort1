'use client';

import { useState } from 'react';

export default function MilestoneReviewModal({ milestoneId, onClose, onSuccess }: { milestoneId: string, onClose: () => void, onSuccess: () => void }) {
   const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
   const [feedback, setFeedback] = useState('');
   const [loading, setLoading] = useState(false);

   const handleSubmit = async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/milestones/${milestoneId}/review`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision, feedback })
         });
         if (!res.ok) throw new Error('Failed to review milestone');
         onSuccess();
      } catch (e) {
         alert('Error reviewing milestone');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-md">
         <div className="bg-surface p-xl rounded-xl w-full max-w-lg shadow-xl border border-outline-variant">
            <h2 className="text-h2 font-display text-on-surface mb-md">Review Milestone</h2>
            <div className="space-y-md">
               <div className="flex gap-md">
                  <button 
                     onClick={() => setDecision('APPROVE')} 
                     className={`flex-1 py-sm rounded-lg border font-label-md transition-all ${decision === 'APPROVE' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary shadow-sm' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
                  >
                     Approve
                  </button>
                  <button 
                     onClick={() => setDecision('REJECT')} 
                     className={`flex-1 py-sm rounded-lg border font-label-md transition-all ${decision === 'REJECT' ? 'bg-error-container text-error border-error shadow-sm' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
                  >
                     Reject (Require Changes)
                  </button>
               </div>

               <div>
                  <label className="block text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider">Feedback {decision === 'REJECT' ? '(Required)' : '(Optional)'}</label>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm focus:ring-2 focus:ring-primary-container outline-none" placeholder={decision === 'REJECT' ? "Explain what needs to be fixed..." : "Great job!"}></textarea>
               </div>

               <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
                  <button onClick={onClose} disabled={loading} className="px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low font-label-md transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleSubmit} disabled={loading || (decision === 'REJECT' && !feedback)} className={`px-lg py-sm rounded-lg text-white font-label-md hover:shadow-lg transition-all disabled:opacity-50 ${decision === 'APPROVE' ? 'bg-tertiary' : 'bg-error'}`}>
                     {loading ? 'Submitting...' : decision === 'APPROVE' ? 'Confirm Approval' : 'Send Rejection'}
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}
