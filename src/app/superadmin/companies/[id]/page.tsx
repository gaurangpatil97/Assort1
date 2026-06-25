'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Shell from '@/components/layout/Shell';

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface TempAdmin {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PENDING_SETUP' | 'SUSPENDED' | 'ARCHIVED';
  timezone: string;
  employeeCount: number;
  createdAt: string;
  admins: Admin[];
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [tempAdmins, setTempAdmins] = useState<TempAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'SUSPENDED' | 'ARCHIVED' | 'ACTIVE' | 'DEACTIVATE_TEMP_ADMIN' | 'REACTIVATE_TEMP_ADMIN' | null;
    targetId?: string;
    targetName?: string;
  }>({ open: false, action: null });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTempAdminModal, setShowTempAdminModal] = useState(false);
  
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [tempAdminForm, setTempAdminForm] = useState({ name: '', email: '' });
  
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCompany();
      fetchTempAdmins();
    }
  }, [id]);

  const fetchCompany = () => {
    fetch(`/api/superadmin/companies/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch company details');
        return res.json();
      })
      .then((data) => {
        setCompany(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const fetchTempAdmins = () => {
    fetch(`/api/superadmin/companies/${id}/temp-admin`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTempAdmins(data);
      })
      .catch(console.error);
  };

  const getInitials = (name: string) => {
    const words = name?.split(' ') || [];
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name?.slice(0, 2).toUpperCase() || '';
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/superadmin/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setCompany(prev => prev ? { ...prev, status: newStatus as any } : null);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTempAdminStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/superadmin/companies/${id}/temp-admin/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTempAdmins(prev => prev.map(t => t.id === userId ? { ...t, status: newStatus as any } : t));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update temp admin');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`/api/superadmin/companies/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      
      setInviteSuccess(`Invite sent to ${inviteForm.email}`);
      setInviteForm({ name: '', email: '' });
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTempAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(`/api/superadmin/companies/${id}/temp-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempAdminForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create temp admin');
      
      setInviteSuccess(`Account created. Temporary password: ${data.tempPassword} — share this securely and ask them to change it immediately.`);
      setTempAdminForm({ name: '', email: '' });
      fetchTempAdmins();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetModals = () => {
    setShowInviteModal(false);
    setShowTempAdminModal(false);
    setInviteForm({ name: '', email: '' });
    setTempAdminForm({ name: '', email: '' });
    setInviteSuccess(null);
    setModalError(null);
  };

  return (
    <Shell>
      <section className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#434655] hover:text-[#131b2e] text-sm font-medium mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M400-80 0-480l400-400 56 57-318 318h822v80H138l318 318-56 57Z"/>
          </svg>
          Back to Companies
        </button>

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        ) : error || !company ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error || 'Company not found'}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="w-[80px] h-[80px] rounded-2xl bg-[#eef2ff] text-[#2563EB] flex items-center justify-center font-bold text-3xl shrink-0 shadow-sm">
                {getInitials(company.name)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-[#131b2e]">{company.name}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                    company.status === 'ACTIVE' ? 'bg-[#34d399]/20 text-[#059669]' :
                    company.status === 'PENDING_SETUP' ? 'bg-[#e2e8f0] text-[#475569]' :
                    company.status === 'SUSPENDED' ? 'bg-[#fecdd3] text-[#e11d48]' :
                    'bg-[#e2e8f0] text-[#475569]'
                  }`}>
                    {company.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>}
                    {company.status === 'PENDING_SETUP' && <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>}
                    {company.status === 'SUSPENDED' && <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48]"></span>}
                    {company.status === 'ARCHIVED' && <span className="w-1.5 h-1.5 rounded-full bg-[#475569]"></span>}
                    {company.status}
                  </span>
                </div>
                <p className="text-[#434655] text-sm">
                  Registered on {new Date(company.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Info Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-5">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold mb-1">Employee Count</p>
                <h3 className="text-xl font-bold text-[#131b2e]">{company.employeeCount}</h3>
              </div>
              <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-5">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold mb-1">Status</p>
                <h3 className="text-xl font-bold text-[#131b2e]">{company.status}</h3>
              </div>
              <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-5">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold mb-1">Timezone</p>
                <h3 className="text-xl font-bold text-[#131b2e]">{company.timezone || 'Not set'}</h3>
              </div>
              <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-5">
                <p className="text-xs text-[#434655] uppercase tracking-wider font-semibold mb-1">Created Date</p>
                <h3 className="text-xl font-bold text-[#131b2e]">
                  {new Date(company.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
              </div>
            </div>

            {/* Company Admins */}
            <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl text-[#131b2e] font-semibold">Company Admins</h3>
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Add Admin
                </button>
              </div>
              
              {(!company.admins || company.admins.length === 0) ? (
                <div className="py-8 text-center text-[#434655] bg-[#f2f3ff] rounded-lg">
                  No admins assigned yet. Send an invite to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {company.admins.map(admin => (
                    <div key={admin.id} className="flex items-center gap-4 p-4 border border-[#c3c6d7] rounded-lg hover:bg-[#f2f3ff] transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#eef2ff] text-[#2563EB] flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T264-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#131b2e]">{admin.name}</div>
                        <div className="text-xs text-[#434655] mt-0.5">{admin.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Temporary Admins */}
            <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl text-[#131b2e] font-semibold">Temporary Admins</h3>
                <button 
                  onClick={() => setShowTempAdminModal(true)}
                  className="bg-white border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Create Temp Admin
                </button>
              </div>

              {tempAdmins.length === 0 ? (
                <div className="py-8 text-center text-[#434655] bg-[#f2f3ff] rounded-lg">
                  No temporary admins created.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#c3c6d7]">
                        <th className="px-4 py-3 text-xs text-[#434655] uppercase tracking-wider font-semibold">Name</th>
                        <th className="px-4 py-3 text-xs text-[#434655] uppercase tracking-wider font-semibold">Email</th>
                        <th className="px-4 py-3 text-xs text-[#434655] uppercase tracking-wider font-semibold">Status</th>
                        <th className="px-4 py-3 text-xs text-[#434655] uppercase tracking-wider font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c3c6d7]">
                      {tempAdmins.map((tAdmin) => (
                        <tr key={tAdmin.id} className="hover:bg-[#f2f3ff] transition-colors">
                          <td className="px-4 py-3 text-sm text-[#131b2e] font-medium">{tAdmin.name}</td>
                          <td className="px-4 py-3 text-sm text-[#434655]">{tAdmin.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              tAdmin.status === 'ACTIVE' ? 'bg-[#34d399]/20 text-[#059669]' : 'bg-[#e2e8f0] text-[#475569]'
                            }`}>
                              {tAdmin.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {tAdmin.status === 'ACTIVE' ? (
                              <button 
                                onClick={() => setConfirmDialog({ open: true, action: 'DEACTIVATE_TEMP_ADMIN', targetId: tAdmin.id, targetName: tAdmin.name })}
                                className="text-sm text-[#dc2626] hover:text-red-800 font-medium transition-colors"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button 
                                onClick={() => setConfirmDialog({ open: true, action: 'REACTIVATE_TEMP_ADMIN', targetId: tAdmin.id, targetName: tAdmin.name })}
                                className="text-sm text-[#059669] hover:text-green-800 font-medium transition-colors"
                              >
                                Reactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm p-6 border-l-4 border-l-[#dc2626]">
              <h3 className="text-xl text-[#131b2e] font-semibold mb-6">Actions</h3>
              <div className="flex flex-wrap gap-4">
                {(company.status === 'ACTIVE' || company.status === 'PENDING_SETUP') && (
                  <button 
                    onClick={() => setConfirmDialog({ open: true, action: 'SUSPENDED', targetName: company.name })}
                    className="px-6 py-2.5 rounded-lg bg-[#dc2626] text-white font-medium text-sm hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Suspend Company
                  </button>
                )}
                {company.status === 'SUSPENDED' && (
                  <button 
                    onClick={() => setConfirmDialog({ open: true, action: 'ACTIVE', targetName: company.name })}
                    className="px-6 py-2.5 rounded-lg bg-[#059669] text-white font-medium text-sm hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Reactivate Company
                  </button>
                )}
                {company.status !== 'ARCHIVED' && (
                  <button 
                    onClick={() => setConfirmDialog({ open: true, action: 'ARCHIVED', targetName: company.name })}
                    className="px-6 py-2.5 rounded-lg bg-[#434655] text-white font-medium text-sm hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    Archive Company
                  </button>
                )}
                {company.status === 'ARCHIVED' && (
                  <button 
                    onClick={() => setConfirmDialog({ open: true, action: 'ACTIVE', targetName: company.name })}
                    className="px-6 py-2.5 rounded-lg bg-[#059669] text-white font-medium text-sm hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Unarchive Company
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </section>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{backgroundColor:'white',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',width:'100%',maxWidth:'480px',margin:'0 16px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid #c3c6d7'}}>
              <h3 style={{fontSize:'18px',fontWeight:700,color:'#131b2e',margin:0}}>Invite Admin</h3>
              <button onClick={resetModals} style={{background:'none',border:'none',cursor:'pointer',color:'#434655',padding:'4px'}}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} style={{padding:'24px',display:'flex',flexDirection:'column',gap:'16px'}}>
              {modalError && (
                <div style={{padding:'12px',backgroundColor:'#fef2f2',color:'#b91c1c',fontSize:'14px',borderRadius:'8px',border:'1px solid #fecaca'}}>
                  {modalError}
                </div>
              )}
              {inviteSuccess && (
                <div style={{padding:'12px',backgroundColor:'#f0fdf4',color:'#15803d',fontSize:'14px',borderRadius:'8px',border:'1px solid #bbf7d0'}}>
                  {inviteSuccess}
                </div>
              )}
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Name *</label>
                <input type="text" required value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Email *</label>
                <input type="email" required value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',paddingTop:'8px'}}>
                <button type="button" onClick={resetModals}
                  style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid #c3c6d7',backgroundColor:'white',color:'#131b2e',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                  Close
                </button>
                <button type="submit" disabled={submitting}
                  style={{padding:'10px 16px',borderRadius:'8px',border:'none',backgroundColor:'#2563EB',color:'white',fontSize:'14px',fontWeight:500,cursor:'pointer',opacity:submitting?0.6:1}}>
                  {submitting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temp Admin Modal */}
      {showTempAdminModal && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{backgroundColor:'white',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',width:'100%',maxWidth:'480px',margin:'0 16px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid #c3c6d7'}}>
              <h3 style={{fontSize:'18px',fontWeight:700,color:'#131b2e',margin:0}}>Create Temp Admin</h3>
              <button onClick={resetModals} style={{background:'none',border:'none',cursor:'pointer',color:'#434655',padding:'4px'}}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
              </button>
            </div>
            <form onSubmit={handleTempAdminSubmit} style={{padding:'24px',display:'flex',flexDirection:'column',gap:'16px'}}>
              {modalError && (
                <div style={{padding:'12px',backgroundColor:'#fef2f2',color:'#b91c1c',fontSize:'14px',borderRadius:'8px',border:'1px solid #fecaca'}}>
                  {modalError}
                </div>
              )}
              {inviteSuccess && (
                <div style={{padding:'16px',backgroundColor:'#f0fdf4',color:'#15803d',fontSize:'14px',borderRadius:'8px',border:'1px solid #bbf7d0'}}>
                  {inviteSuccess}
                </div>
              )}
              {!inviteSuccess && (
                <>
                  <div>
                    <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Name *</label>
                    <input type="text" required value={tempAdminForm.name} onChange={e => setTempAdminForm({...tempAdminForm, name: e.target.value})}
                      style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Email *</label>
                    <input type="email" required value={tempAdminForm.email} onChange={e => setTempAdminForm({...tempAdminForm, email: e.target.value})}
                      style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
                  </div>
                </>
              )}
              <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',paddingTop:'8px'}}>
                <button type="button" onClick={resetModals}
                  style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid #c3c6d7',backgroundColor:'white',color:'#131b2e',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                  Close
                </button>
                {!inviteSuccess && (
                  <button type="submit" disabled={submitting}
                    style={{padding:'10px 16px',borderRadius:'8px',border:'none',backgroundColor:'#2563EB',color:'white',fontSize:'14px',fontWeight:500,cursor:'pointer',opacity:submitting?0.6:1}}>
                    {submitting ? 'Creating...' : 'Create Temp Admin'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{backgroundColor:'white',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',width:'100%',maxWidth:'420px',margin:'0 16px',padding:'24px'}}>
            <h3 style={{fontSize:'18px',fontWeight:700,color:'#131b2e',marginBottom:'8px'}}>
              {confirmDialog.action === 'SUSPENDED' ? 'Suspend Company' :
               confirmDialog.action === 'ARCHIVED' ? 'Archive Company' :
               confirmDialog.action === 'DEACTIVATE_TEMP_ADMIN' ? 'Deactivate Temp Admin' :
               confirmDialog.action === 'REACTIVATE_TEMP_ADMIN' ? 'Reactivate Temp Admin' : 'Reactivate Company'}
            </h3>
            <p style={{fontSize:'14px',color:'#434655',marginBottom:'24px'}}>
              {confirmDialog.action === 'SUSPENDED'
                ? `Are you sure you want to suspend "${confirmDialog.targetName}"? Users will lose access until reactivated.`
                : confirmDialog.action === 'ARCHIVED'
                ? `Are you sure you want to archive "${confirmDialog.targetName}"? The company will be hidden from the main list.`
                : confirmDialog.action === 'DEACTIVATE_TEMP_ADMIN'
                ? `Are you sure you want to deactivate temp admin "${confirmDialog.targetName}"?`
                : confirmDialog.action === 'REACTIVATE_TEMP_ADMIN'
                ? `Are you sure you want to reactivate temp admin "${confirmDialog.targetName}"?`
                : `Are you sure you want to reactivate "${confirmDialog.targetName}"?`}
            </p>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px'}}>
              <button
                onClick={() => setConfirmDialog({ open: false, action: null })}
                style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid #c3c6d7',backgroundColor:'white',color:'#131b2e',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.action === 'DEACTIVATE_TEMP_ADMIN' && confirmDialog.targetId) {
                    handleTempAdminStatusChange(confirmDialog.targetId, 'DEACTIVATED');
                  } else if (confirmDialog.action === 'REACTIVATE_TEMP_ADMIN' && confirmDialog.targetId) {
                    handleTempAdminStatusChange(confirmDialog.targetId, 'ACTIVE');
                  } else if (confirmDialog.action) {
                    handleStatusChange(confirmDialog.action);
                  }
                  setConfirmDialog({ open: false, action: null });
                }}
                style={{padding:'10px 16px',borderRadius:'8px',border:'none',
                  backgroundColor: (confirmDialog.action === 'ACTIVE' || confirmDialog.action === 'REACTIVATE_TEMP_ADMIN') ? '#059669' : 
                                   (confirmDialog.action === 'SUSPENDED' || confirmDialog.action === 'DEACTIVATE_TEMP_ADMIN') ? '#dc2626' : '#434655',
                  color:'white',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                {confirmDialog.action === 'SUSPENDED' ? 'Yes, Suspend' :
                 confirmDialog.action === 'ARCHIVED' ? 'Yes, Archive' :
                 confirmDialog.action === 'DEACTIVATE_TEMP_ADMIN' ? 'Yes, Deactivate' :
                 confirmDialog.action === 'REACTIVATE_TEMP_ADMIN' ? 'Yes, Reactivate' : 'Yes, Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
