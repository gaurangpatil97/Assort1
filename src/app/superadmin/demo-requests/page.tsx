'use client';

import { useState, useEffect, Suspense } from 'react';
import Shell from '@/components/layout/Shell';

interface DemoRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export default function DemoRequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemoRequestsContent />
    </Suspense>
  );
}

function DemoRequestsContent() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    requestId: string;
    companyName: string;
    action: 'approve' | 'reject' | null;
  }>({ open: false, requestId: '', companyName: '', action: null });

  const fetchRequests = () => {
    setLoading(true);
    fetch('/api/superadmin/demo-requests')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch demo requests');
        return res.json();
      })
      .then((data) => {
        setRequests(data.requests || data || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/superadmin/demo-requests/${id}/${action}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error(`Failed to ${action} request`);
      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'ALL' || r.status === filter);
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    approved: requests.filter((r) => r.status === 'APPROVED').length,
    rejected: requests.filter((r) => r.status === 'REJECTED').length,
  };

  const getInitials = (name: string) => {
    const words = name?.split(' ') || [];
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name?.slice(0, 2).toUpperCase() || '';
  };

  const handleExportCSV = () => {
    const headers = ['Company Name', 'Contact Name', 'Email', 'Status', 'Date'];
    const rows = filteredRequests.map(r => [
      `"${r.companyName}"`,
      `"${r.contactName}"`,
      `"${r.email}"`,
      r.status,
      `"${new Date(r.createdAt).toLocaleDateString()}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo_requests.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Shell>
      <section className="p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1200px] mx-auto w-full">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-[#131b2e] leading-tight">Demo Requests</h2>
            <p className="text-[#434655] mt-1 text-sm">Manage inbound demo requests from potential clients.</p>
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#c3c6d7] rounded-md text-[#131b2e] hover:bg-[#f2f3ff] transition-colors text-sm font-medium shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
              <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
            </svg>
            Export List
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-6">
             <div className="h-32 bg-gray-200 rounded-xl"></div>
             <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 text-red-600 rounded-lg border border-red-200">
            Error: {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Requests */}
              <div className="bg-white border border-[#c3c6d7] rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold">Total Requests</p>
                <h3 className="text-3xl text-[#131b2e] font-bold mt-1">{stats.total.toLocaleString()}</h3>
              </div>
              
              {/* Pending */}
              <div className="bg-white border border-[#c3c6d7] rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold">Pending</p>
                <h3 className="text-3xl text-[#d97706] font-bold mt-1">{stats.pending.toLocaleString()}</h3>
              </div>

              {/* Approved */}
              <div className="bg-white border border-[#c3c6d7] rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold">Approved</p>
                <h3 className="text-3xl text-[#059669] font-bold mt-1">{stats.approved.toLocaleString()}</h3>
              </div>

              {/* Rejected */}
              <div className="bg-white border border-[#c3c6d7] rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold">Rejected</p>
                <h3 className="text-3xl text-[#dc2626] font-bold mt-1">{stats.rejected.toLocaleString()}</h3>
              </div>
            </div>

            <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm flex flex-col">
              <div className="flex px-6 border-b border-[#c3c6d7] bg-white pt-2">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      filter === f 
                        ? 'border-[#2563EB] text-[#2563EB]' 
                        : 'border-transparent text-[#434655] hover:text-[#131b2e]'
                    }`}
                  >
                    {f === 'ALL' ? 'All Requests' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              
              {paginatedRequests.length === 0 ? (
                <div className="p-8 text-center text-[#434655]">No requests found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#c3c6d7]">
                          <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Company Name</th>
                          <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Contact</th>
                          <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Email</th>
                          <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Date</th>
                          <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Status</th>
                          <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c3c6d7]">
                        {paginatedRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-[#f2f3ff] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#eef2ff] text-[#2563EB] flex items-center justify-center font-bold text-sm shrink-0">
                                  {getInitials(req.companyName)}
                                </div>
                                <div className="font-semibold text-sm text-[#131b2e]">{req.companyName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#131b2e]">{req.contactName}</td>
                            <td className="px-6 py-4 text-sm text-[#434655]">{req.email}</td>
                            <td className="px-6 py-4 text-sm text-[#434655]">
                              {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                                req.status === 'APPROVED' ? 'bg-[#34d399]/20 text-[#059669]' :
                                req.status === 'PENDING' ? 'bg-[#e2e8f0] text-[#475569]' :
                                req.status === 'REJECTED' ? 'bg-[#fecdd3] text-[#e11d48]' :
                                'bg-[#e2e8f0] text-[#475569]'
                              }`}>
                                {req.status === 'APPROVED' && <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>}
                                {req.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>}
                                {req.status === 'REJECTED' && <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48]"></span>}
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {req.status === 'PENDING' && (
                                <>
                                  <button 
                                    onClick={() => setConfirmDialog({ open: true, requestId: req.id, companyName: req.companyName, action: 'approve' })} 
                                    className="px-3 py-1.5 bg-[#059669] hover:bg-green-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDialog({ open: true, requestId: req.id, companyName: req.companyName, action: 'reject' })} 
                                    className="px-3 py-1.5 bg-[#dc2626] hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination footer */}
                  <div className="px-6 py-4 border-t border-[#c3c6d7] flex justify-between items-center bg-white">
                    <span className="text-sm text-[#434655]">
                      Showing {Math.min(filteredRequests.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredRequests.length, currentPage * ITEMS_PER_PAGE)} of {filteredRequests.length} requests
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 rounded border border-[#c3c6d7] flex items-center justify-center hover:bg-[#f2f3ff] text-[#434655] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button 
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded text-sm font-medium flex items-center justify-center ${
                            currentPage === page 
                              ? 'bg-[#2563EB] text-white border border-[#2563EB]' 
                              : 'border border-[#c3c6d7] text-[#434655] hover:bg-[#f2f3ff]'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 rounded border border-[#c3c6d7] flex items-center justify-center hover:bg-[#f2f3ff] text-[#434655] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{backgroundColor:'white',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',width:'100%',maxWidth:'420px',margin:'0 16px',padding:'24px'}}>
            <h3 style={{fontSize:'18px',fontWeight:700,color:'#131b2e',marginBottom:'8px'}}>
              {confirmDialog.action === 'approve' ? 'Approve Demo Request' : 'Reject Demo Request'}
            </h3>
            <p style={{fontSize:'14px',color:'#434655',marginBottom:'24px'}}>
              {confirmDialog.action === 'approve'
                ? `Are you sure you want to approve the demo request for "${confirmDialog.companyName}"?`
                : `Are you sure you want to reject the demo request for "${confirmDialog.companyName}"?`}
            </p>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px'}}>
              <button
                onClick={() => setConfirmDialog({ open: false, requestId: '', companyName: '', action: null })}
                style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid #c3c6d7',backgroundColor:'white',color:'#131b2e',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.action) handleAction(confirmDialog.requestId, confirmDialog.action);
                  setConfirmDialog({ open: false, requestId: '', companyName: '', action: null });
                }}
                style={{padding:'10px 16px',borderRadius:'8px',border:'none',
                  backgroundColor: confirmDialog.action === 'approve' ? '#059669' : '#dc2626',
                  color:'white',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                {confirmDialog.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
