'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/layout/Shell';

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PENDING_SETUP' | 'SUSPENDED' | 'ARCHIVED';
  employeeCount: number;
  createdAt: string;
  admins: Admin[];
}

export default function SuperadminCompanies() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuperadminCompaniesContent />
    </Suspense>
  );
}

function SuperadminCompaniesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    companyId: string
    companyName: string
    action: 'SUSPENDED' | 'ARCHIVED' | 'ACTIVE' | null
  }>({ open: false, companyId: '', companyName: '', action: null });

  useEffect(() => {
    const f = searchParams.get('filter');
    if (f) setFilterStatus(f);
  }, [searchParams]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', adminName: '', adminEmail: '', timezone: '' });
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = () => {
    setLoading(true);
    fetch('/api/superadmin/companies')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch companies');
        return res.json();
      })
      .then((data) => {
        setCompanies(data.companies || data || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = companies.filter(c => filterStatus === 'ALL' || c.status === filterStatus);
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE));
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const getInitials = (name: string) => {
    const words = name?.split(' ') || [];
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name?.slice(0, 2).toUpperCase() || '';
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Status', 'Employee Count', 'Admin Email', 'Created Date'];
    const rows = filteredCompanies.map(c => [
      `"${c.name}"`,
      c.status,
      c.employeeCount,
      `"${c.admins?.[0]?.email || ''}"`,
      `"${new Date(c.createdAt).toLocaleDateString()}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'companies.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);
    try {
      const res = await fetch('/api/superadmin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register company');
      setShowRegisterModal(false);
      setRegisterForm({ name: '', adminName: '', adminEmail: '', timezone: '' });
      fetchCompanies();
    } catch (err: any) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const requestStatusChange = (company: Company, action: 'SUSPENDED' | 'ARCHIVED' | 'ACTIVE') => {
    setActionMenuOpenId(null);
    setConfirmDialog({ open: true, companyId: company.id, companyName: company.name, action });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/superadmin/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setCompanies(companies.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
        setActionMenuOpenId(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Shell>
      <section className="p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1200px] mx-auto w-full">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-[#131b2e] font-display leading-tight">Companies</h2>
            <p className="text-[#434655] mt-1">Manage all registered organizations.</p>
          </div>
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
              <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
            Register Company
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-6">
             <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            Error: {error}
          </div>
        ) : (
          <div className="bg-white border border-[#c3c6d7] rounded-xl shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-[#c3c6d7] flex justify-between items-center bg-white">
              <h3 className="text-xl text-[#131b2e] font-semibold">Registered Companies</h3>
              <div className="flex items-center gap-3">
                <div className="relative" ref={filterRef}>
                  <button 
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-[#c3c6d7] rounded-md text-[#131b2e] hover:bg-[#f2f3ff] transition-colors text-sm font-medium shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                      <path d="M400-240v-80h160v80H400ZM240-440v-80h480v80H240ZM120-640v-80h720v80H120Z"/>
                    </svg>
                    Filter {filterStatus !== 'ALL' && `(${filterStatus})`}
                  </button>
                  {showFilterDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#c3c6d7] rounded-lg shadow-lg z-20 py-1">
                      {['ALL', 'ACTIVE', 'PENDING_SETUP', 'SUSPENDED', 'ARCHIVED'].map(status => (
                        <button
                          key={status}
                          onClick={() => { setFilterStatus(status); setShowFilterDropdown(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
                        >
                          {status === 'ALL' ? 'All' : status === 'PENDING_SETUP' ? 'Pending Setup' : status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-3 py-1.5 border border-[#c3c6d7] rounded-md text-[#131b2e] hover:bg-[#f2f3ff] transition-colors text-sm font-medium shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                    <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
            
            {paginatedCompanies.length === 0 ? (
              <div className="p-8 text-center text-[#434655]">No companies found.</div>
            ) : (
              <>
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#c3c6d7]">
                        <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Name</th>
                        <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Status</th>
                        <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Employee Count</th>
                        <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold">Created Date</th>
                        <th className="px-6 py-4 text-xs text-[#434655] uppercase tracking-wider font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c3c6d7]">
                      {paginatedCompanies.map((company) => (
                        <tr key={company.id} className="hover:bg-[#f2f3ff] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-[#eef2ff] text-[#2563EB] flex items-center justify-center font-bold text-sm shrink-0">
                                {getInitials(company.name)}
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-[#131b2e]">{company.name}</div>
                                <div className="text-xs text-[#434655] mt-0.5">{company.admins?.[0]?.email || 'No admin assigned'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
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
                          </td>
                          <td className="px-6 py-4 text-sm text-[#131b2e]">{company.employeeCount} Employees</td>
                          <td className="px-6 py-4 text-sm text-[#434655]">
                            {new Date(company.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId(actionMenuOpenId === company.id ? null : company.id);
                              }}
                              className="text-[#434655] hover:text-[#131b2e] p-1 rounded transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                                <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/>
                              </svg>
                            </button>
                            {actionMenuOpenId === company.id && (
                              <div ref={actionMenuRef} className="absolute right-6 top-10 mt-1 w-40 bg-white border border-[#c3c6d7] rounded-lg shadow-lg z-20 py-1 text-left">
                                <button onClick={() => router.push(`/superadmin/companies/${company.id}`)} className="w-full text-left px-4 py-2 text-sm hover:bg-[#f2f3ff] text-[#131b2e]">View Details</button>
                                {(company.status === 'ACTIVE' || company.status === 'PENDING_SETUP') && (
                                  <button onClick={() => requestStatusChange(company, 'SUSPENDED')} className="w-full text-left px-4 py-2 text-sm hover:bg-[#f2f3ff] text-red-600">Suspend</button>
                                )}
                                {company.status === 'SUSPENDED' && (
                                  <button onClick={() => requestStatusChange(company, 'ACTIVE')} className="w-full text-left px-4 py-2 text-sm hover:bg-[#f2f3ff] text-green-600">Reactivate</button>
                                )}
                                {company.status !== 'ARCHIVED' && (
                                  <button onClick={() => requestStatusChange(company, 'ARCHIVED')} className="w-full text-left px-4 py-2 text-sm hover:bg-[#f2f3ff] text-[#434655]">Archive</button>
                                )}
                                {company.status === 'ARCHIVED' && (
                                  <button onClick={() => requestStatusChange(company, 'ACTIVE')} className="w-full text-left px-4 py-2 text-sm hover:bg-[#f2f3ff] text-green-600">Unarchive</button>
                                )}
                              </div>
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
                    Showing {Math.min(filteredCompanies.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredCompanies.length, currentPage * ITEMS_PER_PAGE)} of {filteredCompanies.length} companies
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
        )}
      </section>

      {/* Register Modal */}
      {showRegisterModal && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{backgroundColor:'white',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',width:'100%',maxWidth:'480px',margin:'0 16px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid #c3c6d7'}}>
              <h3 style={{fontSize:'18px',fontWeight:700,color:'#131b2e',margin:0}}>Register Company</h3>
              <button onClick={() => setShowRegisterModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#434655',padding:'4px'}}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
              </button>
            </div>
            <form onSubmit={handleRegister} style={{padding:'24px',display:'flex',flexDirection:'column',gap:'16px'}}>
              {registerError && (
                <div style={{padding:'12px',backgroundColor:'#fef2f2',color:'#b91c1c',fontSize:'14px',borderRadius:'8px',border:'1px solid #fecaca'}}>
                  {registerError}
                </div>
              )}
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Company Name *</label>
                <input type="text" required value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Admin Name *</label>
                <input type="text" required value={registerForm.adminName} onChange={e => setRegisterForm({...registerForm, adminName: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Admin Email *</label>
                <input type="email" required value={registerForm.adminEmail} onChange={e => setRegisterForm({...registerForm, adminEmail: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:600,color:'#131b2e',marginBottom:'4px'}}>Timezone</label>
                <input type="text" placeholder="e.g. Asia/Kolkata" value={registerForm.timezone} onChange={e => setRegisterForm({...registerForm, timezone: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',backgroundColor:'#f2f3ff',border:'1px solid #c3c6d7',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',paddingTop:'8px'}}>
                <button type="button" onClick={() => setShowRegisterModal(false)}
                  style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid #c3c6d7',backgroundColor:'white',color:'#131b2e',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                  Cancel
                </button>
                <button type="submit" disabled={registerLoading}
                  style={{padding:'10px 16px',borderRadius:'8px',border:'none',backgroundColor:'#2563EB',color:'white',fontSize:'14px',fontWeight:500,cursor:'pointer',opacity:registerLoading?0.6:1}}>
                  {registerLoading ? 'Registering...' : 'Register Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{backgroundColor:'white',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',width:'100%',maxWidth:'420px',margin:'0 16px',padding:'24px'}}>
            <h3 style={{fontSize:'18px',fontWeight:700,color:'#131b2e',marginBottom:'8px'}}>
              {confirmDialog.action === 'SUSPENDED' ? 'Suspend Company' :
               confirmDialog.action === 'ARCHIVED' ? 'Archive Company' : 'Reactivate Company'}
            </h3>
            <p style={{fontSize:'14px',color:'#434655',marginBottom:'24px'}}>
              {confirmDialog.action === 'SUSPENDED'
                ? `Are you sure you want to suspend "${confirmDialog.companyName}"? Users will lose access until reactivated.`
                : confirmDialog.action === 'ARCHIVED'
                ? `Are you sure you want to archive "${confirmDialog.companyName}"? The company will be hidden from the main list.`
                : `Are you sure you want to reactivate "${confirmDialog.companyName}"?`}
            </p>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px'}}>
              <button
                onClick={() => setConfirmDialog({ open: false, companyId: '', companyName: '', action: null })}
                style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid #c3c6d7',backgroundColor:'white',color:'#131b2e',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.action) handleStatusChange(confirmDialog.companyId, confirmDialog.action)
                  setConfirmDialog({ open: false, companyId: '', companyName: '', action: null })
                }}
                style={{padding:'10px 16px',borderRadius:'8px',border:'none',
                  backgroundColor: confirmDialog.action === 'ACTIVE' ? '#059669' : confirmDialog.action === 'SUSPENDED' ? '#d97706' : '#dc2626',
                  color:'white',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>
                {confirmDialog.action === 'SUSPENDED' ? 'Yes, Suspend' :
                 confirmDialog.action === 'ARCHIVED' ? 'Yes, Archive' : 'Yes, Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
