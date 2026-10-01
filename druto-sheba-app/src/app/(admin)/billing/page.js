'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { TrendingUp, AlertTriangle, CheckCircle, Search, RefreshCw, CarFront, Loader2, Mail, Send } from 'lucide-react';

export default function AdminBillingDashboard() {
  const [data, setData] = useState({ stats: null, drivers: [], transactions: [] });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState({});
  const [verifyAmounts, setVerifyAmounts] = useState({});
  const [verifyStatus, setVerifyStatus] = useState({});
  const [filterTab, setFilterTab] = useState('ALL');
  const [showMailModal, setShowMailModal] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [mailForm, setMailForm] = useState({
    recipient_type: 'DRIVER',
    recipient_id: '',
    title: '',
    body: '',
    priority: 'HIGH'
  });

  const filteredTransactions = (data.transactions || []).filter(tx => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'PATIENT') return tx.payer_type === 'PATIENT' || tx.payment_purpose === 'Patient_Medical_Bill';
    if (filterTab === 'DISPATCHER') return tx.payer_type === 'DISPATCHER' || tx.payment_purpose?.includes('Dispatcher');
    if (filterTab === 'DRIVER') return (tx.payer_type === 'DRIVER' || !!tx.driver_id || tx.payment_purpose?.includes('Driver')) && tx.payer_type !== 'DISPATCHER';
    return true;
  });

  const fetchDashboard = useCallback(() => {
    fetch(`/api/admin/billing?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useAutoRefresh(fetchDashboard);

  const handleCaution = async (driver) => {
    if (!confirm(`Send a formal Caution Notice to ${driver.name}?`)) return;
    try {
      const res = await fetch('/api/admin/billing/caution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driver_id: driver.driver_id,
          name: driver.name,
          due: driver.cumulative_due,
          overdue_days: driver.consecutive_days_overdue,
          is_company: !driver.own_ambulance_plate
        })
      });
      if (res.ok) {
        alert('Notice dispatched successfully!');
      } else {
        const err = await res.json();
        alert('Failed: ' + err.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleVerify = async (tx) => {
    const isPatient = tx.payer_type === 'PATIENT' || tx.payment_purpose === 'Patient_Medical_Bill';
    const isExpiredPartial = isPatient && (tx.hours_elapsed >= 3 || tx.appointment_status === 'Cancelled');
    
    // If it's a refund scenario, force status to 'Refunded', otherwise take from dropdown
    const status = isExpiredPartial ? 'Refunded' : (verifyStatus[tx.payment_id] || 'Settled');
    const amount = verifyAmounts[tx.payment_id] || tx.amount_expected;

    if (!confirm(isExpiredPartial ? `Process refund of ৳${amount} for this transaction?` : `Verify this transaction as ${status} with amount ৳${amount}?`)) return;

    setVerifying(prev => ({ ...prev, [tx.payment_id]: true }));
    try {
      const res = await fetch('/api/admin/billing/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payment_id: tx.payment_id,
          driver_id: tx.driver_id,
          status,
          amount_verified: parseFloat(amount)
        })
      });
      if (res.ok) {
        alert('Transaction verified successfully!');
        fetchDashboard();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setVerifying(prev => ({ ...prev, [tx.payment_id]: false }));
    }
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2>Platform Revenue & Settlements</h2>
          <p className="page-header-sub">Manage driver collections, verified payments, and default notices</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a 
            href="/admin-mail"
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
          >
            <Mail size={16} /> Official Mail Desk
          </a>
          <button className="btn btn-secondary" onClick={fetchDashboard} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Live Receivables Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--blue)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Today's Total Cash Collected</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
            ৳{parseFloat(data.stats?.total_cash_collected || 0).toLocaleString()}
          </div>
        </div>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--orange)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Today's Pending Commission</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
            ৳{parseFloat(data.stats?.total_pending_commission || 0).toLocaleString()}
          </div>
        </div>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--green)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Today's Settled Commission</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>
            ৳{parseFloat(data.stats?.total_settled_commission || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 30 }}>
        
        {/* Section B: Submitted Transactions */}
        <div className="section-card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0 }}><CheckCircle size={18} /> Pending Verifications ({filteredTransactions.length})</h3>
            
            {/* Filter Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 4, borderRadius: 10, gap: 4 }}>
              {['ALL', 'PATIENT', 'DRIVER', 'DISPATCHER'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: filterTab === tab ? 'var(--blue)' : 'transparent',
                    color: filterTab === tab ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab === 'ALL' ? 'All' : tab === 'PATIENT' ? 'Patient' : tab === 'DRIVER' ? 'Driver' : 'Dispatcher'}
                </button>
              ))}
            </div>
          </div>
          <div className="section-body">
            <table>
              <thead>
                <tr>
                  <th>Submission ID</th>
                  <th>Name</th>
                  <th>TrxID</th>
                  <th>Claimed Amount</th>
                  <th>Verification Status</th>
                  <th>Verified Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => {
                  const isPatient = tx.payer_type === 'PATIENT' || tx.payment_purpose === 'Patient_Medical_Bill';
                  const isDispatcher = tx.payer_type === 'DISPATCHER' || tx.payment_purpose?.includes('Dispatcher');
                  const isDriver = !isDispatcher && (tx.payer_type === 'DRIVER' || !!tx.driver_id || tx.payment_purpose?.includes('Driver'));
                  const isVerificationPayment = isDriver || isDispatcher;
                  const isExpiredPartial = isPatient && (tx.hours_elapsed >= 3 || tx.appointment_status === 'Cancelled');

                  const badgeLetter = isPatient ? 'P' : isDispatcher ? 'DP' : 'D';
                  const badgeColor = isPatient ? '#ff2d55' : isDispatcher ? '#8b5cf6' : '#007aff';
                  const badgeBg = isPatient ? 'rgba(255, 45, 85, 0.15)' : isDispatcher ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 122, 255, 0.15)';

                  return (
                    <tr 
                      key={tx.payment_id}
                      style={isExpiredPartial ? { background: 'rgba(255, 59, 48, 0.08)', borderLeft: '4px solid var(--red)' } : {}}
                    >
                      <td style={{ fontWeight: 600 }}>
                        #TX-{tx.payment_id}
                        {isExpiredPartial && (
                          <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 800, marginTop: 2 }}>
                            ⚠️ REFUND NEEDED (Expired/Cancelled)
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 22,
                            height: 20,
                            padding: '0 4px',
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 800,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}66`
                          }} title={isPatient ? 'Patient' : isDispatcher ? 'Dispatcher' : 'Driver'}>
                            {badgeLetter}
                          </span>
                          <span style={{ fontWeight: 600 }}>{tx.payer_name || 'Applicant'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 28 }}>
                          {tx.sender_phone || tx.registered_phone}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue)' }}>{tx.transaction_id}</td>
                      <td style={{ fontWeight: 700 }}>৳{parseFloat(tx.amount_expected).toLocaleString()}</td>
                      <td>
                        <select 
                          value={verifyStatus[tx.payment_id] || 'Settled'}
                          onChange={e => setVerifyStatus(prev => ({...prev, [tx.payment_id]: e.target.value}))}
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontWeight: 700 }}
                        >
                          <option value="Settled">Settled (Paid)</option>
                          <option value="Due">Due (Partial)</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="number"
                          placeholder="Amount"
                          value={verifyAmounts[tx.payment_id] ?? parseFloat(tx.amount_expected)}
                          onChange={e => setVerifyAmounts(prev => ({...prev, [tx.payment_id]: e.target.value}))}
                          style={{ width: 100, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
                        />
                      </td>
                      <td>
                        <button 
                          disabled={verifying[tx.payment_id]}
                          onClick={() => handleVerify(tx)}
                          className="btn btn-primary btn-sm"
                          style={{ 
                            background: isExpiredPartial ? 'var(--red)' : undefined, 
                            borderColor: isExpiredPartial ? 'var(--red)' : undefined, 
                            opacity: verifying[tx.payment_id] ? 0.7 : 1 
                          }}
                        >
                          {verifying[tx.payment_id] ? <Loader2 size={14} className="animate-spin" /> : (isExpiredPartial ? 'Process Refund' : 'Save & Verify')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No pending verifications for selected filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section A: Driver Due List */}
        <div className="section-card">
          <div className="section-header">
            <h3><AlertTriangle size={18} /> Driver Settlement Ledger</h3>
          </div>
          <div className="section-body">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Today's Col.</th>
                  <th>Cumulative Due</th>
                  <th>Overdue Days</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.drivers.map(driver => {
                  const isCritical = driver.consecutive_days_overdue >= 7;
                  return (
                    <tr key={driver.driver_id} style={isCritical ? { background: 'rgba(255, 59, 48, 0.05)' } : {}}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{driver.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{driver.phone}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CarFront size={14} style={{ color: driver.own_ambulance_plate ? 'var(--blue)' : 'var(--orange)' }} />
                          {driver.own_ambulance_plate ? 'Own Amb' : 'Company Fleet'}
                        </div>
                      </td>
                      <td>৳{parseFloat(driver.todays_cash || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: driver.cumulative_due > 0 ? 'var(--red)' : 'var(--text-primary)' }}>
                        ৳{parseFloat(driver.cumulative_due || 0).toLocaleString()}
                      </td>
                      <td>
                        {driver.consecutive_days_overdue > 0 ? (
                          <span className={`badge ${isCritical ? 'badge-critical' : 'badge-medium'}`}>
                            {driver.consecutive_days_overdue} Days
                          </span>
                        ) : (
                          <span className="badge badge-low">Up to date</span>
                        )}
                      </td>
                      <td>
                        {driver.consecutive_days_overdue >= 7 && (
                          <button 
                            onClick={() => handleCaution(driver)}
                            className="btn btn-sm" 
                            style={{ background: 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <AlertTriangle size={14} /> Send Caution
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Manual Mail / Official Notice Modal */}
      {showMailModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 16, maxWidth: 550, width: '100%',
            padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.4)', border: '1px solid var(--border-accent)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0, 122, 255, 0.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Compose Official Notice</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send directly to Driver or Patient portal inbox</div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowMailModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '50%', width: 32, height: 32, padding: 0 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!mailForm.recipient_id || !mailForm.title || !mailForm.body) {
                alert('Please fill out all fields.');
                return;
              }
              setSendingMail(true);
              try {
                const res = await fetch('/api/admin/billing/mail', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(mailForm)
                });
                if (res.ok) {
                  alert('Official notice sent successfully!');
                  setShowMailModal(false);
                  setMailForm({
                    recipient_type: 'DRIVER',
                    recipient_id: '',
                    title: '',
                    body: '',
                    priority: 'HIGH'
                  });
                } else {
                  const err = await res.json();
                  alert('Failed: ' + err.error);
                }
              } catch (err) {
                alert('Error: ' + err.message);
              } finally {
                setSendingMail(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Recipient Type</label>
                  <select
                    value={mailForm.recipient_type}
                    onChange={(e) => setMailForm(prev => ({ ...prev, recipient_type: e.target.value, recipient_id: '' }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 13 }}
                  >
                    <option value="DRIVER">Driver</option>
                    <option value="PATIENT">Patient</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Select Recipient</label>
                  <select
                    required
                    value={mailForm.recipient_id}
                    onChange={(e) => setMailForm(prev => ({ ...prev, recipient_id: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 13 }}
                  >
                    <option value="">-- Choose {mailForm.recipient_type === 'DRIVER' ? 'Driver' : 'Patient'} --</option>
                    {mailForm.recipient_type === 'DRIVER' ? (
                      (data.drivers || []).map(d => (
                        <option key={d.driver_id} value={d.driver_id}>
                          {d.name} ({d.phone || `ID: ${d.driver_id}`})
                        </option>
                      ))
                    ) : (
                      (data.patients || []).map(p => (
                        <option key={p.patient_id} value={p.patient_id}>
                          {p.name} ({p.phone || `ID: ${p.patient_id}`})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Notice Subject / Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. FINAL NOTICE — বকেয়া Payment ও Ambulance ফেরত"
                  value={mailForm.title}
                  onChange={(e) => setMailForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Notice Body</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Type your official communication, warning, or refund instruction here..."
                  value={mailForm.body}
                  onChange={(e) => setMailForm(prev => ({ ...prev, body: e.target.value }))}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 13, lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowMailModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMail}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {sendingMail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {sendingMail ? 'Sending...' : 'Send Notice'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
