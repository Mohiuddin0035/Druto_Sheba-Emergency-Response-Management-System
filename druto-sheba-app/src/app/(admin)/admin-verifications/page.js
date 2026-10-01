'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, 
  CarFront, UserCheck, FileText, DollarSign, Clock, Eye, X, Send, 
  Award, GraduationCap, CheckCircle2, RotateCcw, History
} from 'lucide-react';

export default function AdminVerificationsPage() {
  const [data, setData] = useState({ drivers: [], dispatchers: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'DRIVER', 'DISPATCHER', 'REFUND_QUEUE'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inspection Modal
  const [inspectModal, setInspectModal] = useState({ open: false, item: null, type: null });

  // Rejection Modal
  const [rejectModal, setRejectModal] = useState({ 
    open: false, 
    item: null, 
    type: null,
    reason: 'Under-Payment (৳৫০০ এর কম পরিশোধিত)',
    customNotes: '',
    markRefund: true
  });

  // Refund Settlement Modal
  const [refundModal, setRefundModal] = useState({
    open: false,
    item: null,
    type: null,
    refundTrxId: ''
  });

  const [processingId, setProcessingId] = useState(null);
  const [selectedDecisions, setSelectedDecisions] = useState({});

  const handleDecisionExecution = async (item, type) => {
    const id = type === 'DRIVER' ? item.driver_id : item.dispatcher_id;
    const name = type === 'DRIVER' ? item.driver_name : item.dispatcher_name;
    const decision = selectedDecisions[`${type}-${id}`] || 'VERIFIED';

    if (decision === 'VERIFIED') {
      await handleApprove(item, type);
    } else if (decision === 'PAYMENT_ISSUE') {
      if (!confirm(`Apply decision "Payment Issue" for ${name}? Driver will receive partial payment refund notice.`)) return;
      setProcessingId(`decision-${type}-${id}`);
      try {
        const res = await fetch('/api/admin/verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'REJECT',
            target_type: type,
            target_id: id,
            payment_id: item.payment_id,
            rejection_reason: 'PAYMENT_ISSUE'
          })
        });
        const json = await res.json();
        if (res.ok) {
          alert('Decision applied: Payment Issue notice dispatched.');
          fetchVerifications();
        } else {
          alert('Error: ' + (json.error || 'Failed to apply decision'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        setProcessingId(null);
      }
    } else if (decision === 'DOC_ISSUE') {
      if (!confirm(`Apply decision "Documentation Issue" for ${name}? Driver will receive document discrepancy notice.`)) return;
      setProcessingId(`decision-${type}-${id}`);
      try {
        const res = await fetch('/api/admin/verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'REJECT',
            target_type: type,
            target_id: id,
            payment_id: item.payment_id,
            rejection_reason: 'DOC_ISSUE'
          })
        });
        const json = await res.json();
        if (res.ok) {
          alert('Decision applied: Documentation Issue notice dispatched.');
          fetchVerifications();
        } else {
          alert('Error: ' + (json.error || 'Failed to apply decision'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        setProcessingId(null);
      }
    } else if (decision === 'REJECTED') {
      // For Dispatcher Reject
      if (!confirm(`Reject dispatcher application for ${name}?`)) return;
      setProcessingId(`decision-${type}-${id}`);
      try {
        const res = await fetch('/api/admin/verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'REJECT',
            target_type: type,
            target_id: id,
            payment_id: item.payment_id,
            rejection_reason: 'NID & Profile Data Mismatch'
          })
        });
        const json = await res.json();
        if (res.ok) {
          alert('Dispatcher application rejected.');
          fetchVerifications();
        } else {
          alert('Error: ' + (json.error || 'Failed to reject'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        setProcessingId(null);
      }
    } else if (decision === 'UNPAID_CANCEL') {
      if (!confirm(`Cancel ${name}'s application due to NO payment after 7 days?`)) return;
      setProcessingId(`decision-${type}-${id}`);
      try {
        const res = await fetch('/api/admin/verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'REJECT',
            target_type: type,
            target_id: id,
            payment_id: item.payment_id,
            rejection_reason: 'UNPAID_CANCEL'
          })
        });
        if (res.ok) {
          alert('Application canceled for no payment.');
          fetchVerifications();
        }
      } finally {
        setProcessingId(null);
      }
    } else if (decision === 'DUE_CANCEL') {
      if (!confirm(`Cancel ${name}'s application due to PARTIAL payment after 7 days? They will be notified for refund.`)) return;
      setProcessingId(`decision-${type}-${id}`);
      try {
        const res = await fetch('/api/admin/verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'REJECT',
            target_type: type,
            target_id: id,
            payment_id: item.payment_id,
            rejection_reason: 'DUE_CANCEL'
          })
        });
        if (res.ok) {
          alert('Application canceled for partial payment. Refund notice sent.');
          fetchVerifications();
        }
      } finally {
        setProcessingId(null);
      }
    }
  };

  const fetchVerifications = useCallback(() => {
    fetch(`/api/admin/verifications?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res);
        }
      })
      .catch(err => console.error('Error fetching verifications:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  useAutoRefresh(fetchVerifications);

  // 1-Click Approve Handler
  const handleApprove = async (item, type) => {
    const name = type === 'DRIVER' ? item.driver_name : item.dispatcher_name;
    const id = type === 'DRIVER' ? item.driver_id : item.dispatcher_id;
    if (!confirm(`Are you sure you want to approve and activate ${type} ${name} (ID: #${id})?`)) return;

    setProcessingId(`approve-${type}-${id}`);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          target_type: type,
          target_id: id,
          payment_id: item.payment_id
        })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Approved successfully!');
        setInspectModal({ open: false, item: null, type: null });
        fetchVerifications();
      } else {
        alert('Error: ' + (json.error || 'Failed to approve'));
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Submit Rejection Handler
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    const { item, type, reason, customNotes } = rejectModal;
    const id = type === 'DRIVER' ? item.driver_id : item.dispatcher_id;

    setProcessingId(`reject-${type}-${id}`);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          target_type: type,
          target_id: id,
          payment_id: item.payment_id,
          rejection_reason: reason,
          custom_notes: customNotes
        })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Application rejected and notice dispatched.');
        setRejectModal({ open: false, item: null, type: null, reason: 'Under-Payment (৳৫০০ এর কম পরিশোধিত)', customNotes: '', markRefund: true });
        setInspectModal({ open: false, item: null, type: null });
        fetchVerifications();
      } else {
        alert('Error: ' + (json.error || 'Failed to reject'));
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Settle Refund Handler
  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    const { item, type, refundTrxId } = refundModal;
    if (!refundTrxId.trim()) {
      alert('Please enter the Refund TrxID');
      return;
    }
    const id = type === 'DRIVER' ? item.driver_id : item.dispatcher_id;

    setProcessingId(`refund-${type}-${id}`);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REFUND_SETTLE',
          target_type: type,
          target_id: id,
          payment_id: item.payment_id,
          refund_trx_id: refundTrxId.trim()
        })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Refund settled successfully!');
        setRefundModal({ open: false, item: null, type: null, refundTrxId: '' });
        fetchVerifications();
      } else {
        alert('Error: ' + (json.error || 'Failed to settle refund'));
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Filter queues
  const filterList = (list, type) => {
    return list.filter(item => {
      const name = type === 'DRIVER' ? item.driver_name : item.dispatcher_name;
      const phone = type === 'DRIVER' ? item.driver_reg_phone : item.dispatcher_reg_phone;
      const trx = item.transaction_id || '';
      const nid = item.nid_number || '';
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || 
        (name && name.toLowerCase().includes(term)) ||
        (phone && phone.includes(term)) ||
        (trx && trx.toLowerCase().includes(term)) ||
        (nid && nid.includes(term));

      if (!matchesSearch) return false;

      if (activeTab === 'REFUND_QUEUE') {
        return item.refund_status === 'Pending_48h' || item.refund_status === 'Pending';
      }

      if (activeTab === 'DRIVER') return type === 'DRIVER';
      if (activeTab === 'DISPATCHER') return type === 'DISPATCHER';

      if (activeTab === 'UNPAID') {
        return !item.transaction_id && item.verification_status !== 'Approved' && item.verification_status !== 'Verified' && item.verification_status !== 'Rejected';
      }

      if (activeTab === 'DUE') {
        return item.transaction_id && (parseFloat(item.amount_paid || 0) < parseFloat(item.amount_expected || 500)) && item.verification_status !== 'Approved' && item.verification_status !== 'Verified' && item.verification_status !== 'Rejected';
      }

      return true;
    });
  };

  const isOlderThan7Days = (dateString) => {
    if (!dateString) return false;
    const pastDate = new Date(dateString).getTime();
    const now = Date.now();
    return (now - pastDate) > 7 * 24 * 60 * 60 * 1000;
  };

  const sort7DaysToTop = (a, b) => {
    const aOld = isOlderThan7Days(a.payment_submitted_at || a.registered_at);
    const bOld = isOlderThan7Days(b.payment_submitted_at || b.registered_at);
    if (aOld && !bOld) return -1;
    if (!aOld && bOld) return 1;
    return 0;
  };

  const isPending = (item) => {
    if (item.refund_status === 'Pending_48h' || item.refund_status === 'Pending') return true;
    if (item.verification_status === 'Verified' || item.verification_status === 'Approved') return false;
    if (item.verification_status === 'Rejected' && (!item.refund_status || item.refund_status === 'Refunded')) return false;
    return true; // default to pending if not clearly resolved
  };

  const baseDrivers = filterList(data.drivers || [], 'DRIVER');
  const baseDispatchers = filterList(data.dispatchers || [], 'DISPATCHER');

  const filteredDrivers = (activeTab === 'DISPATCHER') ? [] : baseDrivers.filter(isPending).sort(sort7DaysToTop);
  const filteredDispatchers = (activeTab === 'DRIVER') ? [] : baseDispatchers.filter(isPending).sort(sort7DaysToTop);

  const historyDrivers = baseDrivers.filter(item => !isPending(item));
  const historyDispatchers = baseDispatchers.filter(item => !isPending(item));

  const tabCounts = {
    drivers: (data.drivers || []).filter(isPending).length,
    dispatchers: (data.dispatchers || []).filter(isPending).length,
    unpaid: [...(data.drivers || []), ...(data.dispatchers || [])].filter(item => !item.transaction_id && item.verification_status !== 'Approved' && item.verification_status !== 'Verified' && item.verification_status !== 'Rejected').length,
    due: [...(data.drivers || []), ...(data.dispatchers || [])].filter(item => item.transaction_id && (parseFloat(item.amount_paid || 0) < parseFloat(item.amount_expected || 500)) && item.verification_status !== 'Approved' && item.verification_status !== 'Verified' && item.verification_status !== 'Rejected').length
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <ShieldCheck color="var(--blue)" size={26} /> Driver & Dispatcher Verification Audit
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Review applicant credentials, inspect ৳500 verification payments, 1-click approvals, and 48h refund processing
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchVerifications} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--blue)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>PENDING DRIVERS</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
            {data.counts?.pending_drivers || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Awaiting license & fee review</div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>PENDING DISPATCHERS</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981', marginTop: 4 }}>
            {data.counts?.pending_dispatchers || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Awaiting HSC & qualification review</div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>48H REFUND QUEUE</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#ef4444', marginTop: 4 }}>
            {data.counts?.refund_queue_count || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Under-payments & rejected applicants</div>
        </div>
      </div>

      {/* Tabs and Search Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20, 
        flexWrap: 'wrap', 
        gap: 12,
        background: 'var(--bg-card)',
        padding: '12px 16px',
        borderRadius: 14,
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Applicants (${tabCounts.drivers + tabCounts.dispatchers})` },
            { id: 'DRIVER', label: `Drivers (${tabCounts.drivers})` },
            { id: 'DISPATCHER', label: `Dispatchers (${tabCounts.dispatchers})` },
            { id: 'REFUND_QUEUE', label: `⚠️ 48h Refund Queue (${data.counts?.refund_queue_count || 0})` },
            { id: 'UNPAID', label: `Unpaid (${tabCounts.unpaid})` },
            { id: 'DUE', label: `Due (${tabCounts.due})` }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === t.id ? 'var(--blue)' : 'var(--bg-secondary)',
                color: activeTab === t.id ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search Name, Phone, TrxID, NID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 32, height: 36, fontSize: 12.5, borderRadius: 8 }}
          />
        </div>
      </div>

      {/* DRIVERS SECTION */}
      {(activeTab === 'ALL' || activeTab === 'DRIVER' || activeTab === 'REFUND_QUEUE' || activeTab === 'UNPAID' || activeTab === 'DUE') && filteredDrivers.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0, 122, 255, 0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CarFront size={18} color="var(--blue)" />
            <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
              Driver Verification Queue ({filteredDrivers.length})
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Driver</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>NID & License</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Ambulance / Certs</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>TrxID & Paid From</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Payment Status</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Account Status</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Decision</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map(drv => {
                  const isPaid = drv.payment_status === 'Settled' || drv.payment_status === 'Verified' || parseFloat(drv.amount_paid || 0) >= 500;
                  const isDue = drv.payment_status === 'Due' || (parseFloat(drv.amount_paid || 0) > 0 && parseFloat(drv.amount_paid || 0) < 500);
                  const isApproved = drv.verification_status === 'Verified' || drv.verification_status === 'Approved';
                  const isRejected = drv.verification_status === 'Rejected';
                  const isRefundPending = drv.refund_status === 'Pending_48h' || drv.refund_status === 'Pending';
                  const isRefunded = drv.refund_status === 'Refunded';

                  const currentDecision = selectedDecisions[`DRIVER-${drv.driver_id}`] || (isApproved ? 'VERIFIED' : (isRejected ? 'PAYMENT_ISSUE' : 'VERIFIED'));
                  const is7DaysUnpaid = isOlderThan7Days(drv.payment_submitted_at || drv.registered_at) && !isPaid && !isApproved && !isRejected;

                  return (
                    <tr key={drv.driver_id} style={{ borderBottom: '1px solid var(--border-subtle)', background: is7DaysUnpaid ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{drv.driver_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: #{drv.driver_id} • 📞 {drv.driver_reg_phone}</div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 11.5 }}>
                          <strong>NID:</strong> {drv.nid_number || <span style={{ color: 'var(--text-muted)' }}>Not Submitted</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          <strong>Lic:</strong> {drv.license_no || 'Pending'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div>{drv.own_ambulance_plate ? `Own: ${drv.own_ambulance_plate}` : 'Company Fleet'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {drv.total_submissions} Certificate(s) attached
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {drv.transaction_id ? (
                          <div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--blue)' }}>{drv.transaction_id}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>From: {drv.refund_sender_number || drv.driver_reg_phone} ({drv.payment_method || 'bKash'})</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>⏳ Payment Unpaid</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                          background: isPaid ? 'rgba(16, 185, 129, 0.15)' : (isDue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                          color: isPaid ? '#10b981' : (isDue ? '#ef4444' : '#f59e0b'),
                          border: `1px solid ${isPaid ? '#10b98166' : (isDue ? '#ef444466' : '#f59e0b66')}`
                        }}>
                          {isPaid ? 'Paid' : (isDue ? 'Due' : 'Unpaid')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {isRefundPending && (
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            ⚠️ 48h Refund Due
                          </span>
                        )}
                        {isRefunded && (
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            ✅ Refunded
                          </span>
                        )}
                        {!isRefundPending && !isRefunded && (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            background: isApproved ? 'rgba(16, 185, 129, 0.15)' : (isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                            color: isApproved ? '#10b981' : (isRejected ? '#ef4444' : '#f59e0b')
                          }}>
                            {drv.verification_status || 'Pending'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <select
                          disabled={isApproved || processingId === `decision-DRIVER-${drv.driver_id}`}
                          value={currentDecision}
                          onChange={(e) => setSelectedDecisions(prev => ({ ...prev, [`DRIVER-${drv.driver_id}`]: e.target.value }))}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-secondary)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="VERIFIED">Verified</option>
                          <option value="PAYMENT_ISSUE">Payment Issue</option>
                          <option value="DOC_ISSUE">Documentation Issue</option>
                          <option value="UNPAID_CANCEL">Cancel - Unpaid (7 Days)</option>
                          <option value="DUE_CANCEL">Cancel - Partial Paid (7 Days)</option>
                        </select>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => setInspectModal({ open: true, item: drv, type: 'DRIVER' })}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} /> View
                          </button>

                          {isRefundPending && (
                            <button
                              onClick={() => setRefundModal({ open: true, item: drv, type: 'DRIVER', refundTrxId: '' })}
                              style={{
                                padding: '6px 10px',
                                fontSize: 11.5,
                                fontWeight: 800,
                                borderRadius: 8,
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <RotateCcw size={13} /> Settle 48h
                            </button>
                          )}

                          {!isApproved && (
                            <button
                              onClick={() => handleDecisionExecution(drv, 'DRIVER')}
                              disabled={processingId === `decision-DRIVER-${drv.driver_id}` || processingId === `approve-DRIVER-${drv.driver_id}`}
                              style={{
                                padding: '6px 12px',
                                fontSize: 11.5,
                                fontWeight: 800,
                                borderRadius: 8,
                                border: 'none',
                                background: currentDecision === 'VERIFIED' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Send size={12} /> {processingId === `decision-DRIVER-${drv.driver_id}` ? 'Processing...' : 'Save Decision'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISPATCHERS SECTION */}
      {(activeTab === 'ALL' || activeTab === 'DISPATCHER' || activeTab === 'REFUND_QUEUE' || activeTab === 'UNPAID' || activeTab === 'DUE') && filteredDispatchers.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={18} color="#10b981" />
            <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
              Dispatcher Clearance Queue ({filteredDispatchers.length})
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Dispatcher</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>National ID (NID)</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>HSC & Education Board</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>TrxID & Paid From</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Payment Status</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Account Status</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Decision</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatchers.map(disp => {
                  const isPaid = disp.payment_status === 'Settled' || disp.payment_status === 'Verified' || parseFloat(disp.amount_paid || 0) >= 500;
                  const isDue = disp.payment_status === 'Due' || (parseFloat(disp.amount_paid || 0) > 0 && parseFloat(disp.amount_paid || 0) < 500);
                  const isApproved = disp.verification_status === 'Approved' || disp.verification_status === 'Verified';
                  const isRejected = disp.verification_status === 'Rejected';
                  const isRefundPending = disp.refund_status === 'Pending_48h' || disp.refund_status === 'Pending';
                  const isRefunded = disp.refund_status === 'Refunded';

                  const currentDecision = selectedDecisions[`DISPATCHER-${disp.dispatcher_id}`] || (isApproved ? 'VERIFIED' : (isRejected ? 'REJECTED' : 'VERIFIED'));
                  const is7DaysUnpaid = isOlderThan7Days(disp.payment_submitted_at || disp.registered_at) && !isPaid && !isApproved && !isRejected;

                  // Extract latest HSC submission
                  const latestVerif = (disp.verifications && disp.verifications[0]) || {};

                  return (
                    <tr key={disp.dispatcher_id} style={{ borderBottom: '1px solid var(--border-subtle)', background: is7DaysUnpaid ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{disp.dispatcher_name || disp.username}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: #{disp.dispatcher_id} • 📞 {disp.dispatcher_reg_phone || 'N/A'}</div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {disp.nid_number || latestVerif.nid_number || <span style={{ color: 'var(--text-muted)' }}>Not Submitted</span>}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {latestVerif.hsc_passing_year ? (
                          <div>
                            <div><strong>HSC:</strong> {latestVerif.education_board} ({latestVerif.hsc_passing_year})</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Roll: {latestVerif.hsc_roll_number || 'N/A'} • Reg: {latestVerif.hsc_registration_number || 'N/A'}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending Submission</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {disp.transaction_id ? (
                          <div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--blue)' }}>{disp.transaction_id}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>From: {disp.refund_sender_number || disp.dispatcher_reg_phone} ({disp.payment_method || 'bKash'})</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>⏳ Payment Unpaid</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                          background: isPaid ? 'rgba(16, 185, 129, 0.15)' : (isDue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                          color: isPaid ? '#10b981' : (isDue ? '#ef4444' : '#f59e0b'),
                          border: `1px solid ${isPaid ? '#10b98166' : (isDue ? '#ef444466' : '#f59e0b66')}`
                        }}>
                          {isPaid ? 'Paid' : (isDue ? 'Due' : 'Unpaid')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {isRefundPending && (
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            ⚠️ 48h Refund Due
                          </span>
                        )}
                        {isRefunded && (
                          <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            ✅ Refunded
                          </span>
                        )}
                        {!isRefundPending && !isRefunded && (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            background: isApproved ? 'rgba(16, 185, 129, 0.15)' : (isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                            color: isApproved ? '#10b981' : (isRejected ? '#ef4444' : '#f59e0b')
                          }}>
                            {disp.verification_status || 'Pending'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <select
                          disabled={isApproved || processingId === `decision-DISPATCHER-${disp.dispatcher_id}`}
                          value={currentDecision}
                          onChange={(e) => setSelectedDecisions(prev => ({ ...prev, [`DISPATCHER-${disp.dispatcher_id}`]: e.target.value }))}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-secondary)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="VERIFIED">Verified</option>
                          <option value="REJECTED">Cancel / Reject</option>
                          <option value="UNPAID_CANCEL">Cancel - Unpaid (7 Days)</option>
                          <option value="DUE_CANCEL">Cancel - Partial Paid (7 Days)</option>
                        </select>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => setInspectModal({ open: true, item: disp, type: 'DISPATCHER' })}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Eye size={13} /> View
                          </button>

                          {isRefundPending && (
                            <button
                              onClick={() => setRefundModal({ open: true, item: disp, type: 'DISPATCHER', refundTrxId: '' })}
                              style={{
                                padding: '6px 10px',
                                fontSize: 11.5,
                                fontWeight: 800,
                                borderRadius: 8,
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <RotateCcw size={13} /> Settle 48h
                            </button>
                          )}

                          {!isApproved && (
                            <button
                              onClick={() => handleDecisionExecution(disp, 'DISPATCHER')}
                              disabled={processingId === `decision-DISPATCHER-${disp.dispatcher_id}` || processingId === `approve-DISPATCHER-${disp.dispatcher_id}`}
                              style={{
                                padding: '6px 12px',
                                fontSize: 11.5,
                                fontWeight: 800,
                                borderRadius: 8,
                                border: 'none',
                                background: currentDecision === 'VERIFIED' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Send size={12} /> {processingId === `decision-DISPATCHER-${disp.dispatcher_id}` ? 'Processing...' : 'Save Decision'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY SECTION (DRIVERS) */}
      {(activeTab === 'ALL' || activeTab === 'DRIVER') && historyDrivers.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden', opacity: 0.85 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(107, 114, 128, 0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="var(--text-secondary)" />
            <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
              Driver Decision History ({historyDrivers.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Driver</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>NID / Phone</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Payment Info</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Final Outcome</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyDrivers.map(drv => {
                  const isApproved = drv.verification_status === 'Verified' || drv.verification_status === 'Approved';
                  return (
                    <tr key={`hist-${drv.driver_id}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{drv.driver_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: #{drv.driver_id}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 11.5 }}>{drv.nid_number || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{drv.driver_reg_phone}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{drv.transaction_id || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{drv.payment_status || 'Pending'}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                          background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isApproved ? '#10b981' : '#ef4444'
                        }}>
                          {drv.verification_status}
                        </span>
                        {drv.refund_status === 'Refunded' && (
                          <div style={{ fontSize: 10, marginTop: 4, color: '#10b981', fontWeight: 700 }}>✅ Refund Settled</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button onClick={() => setInspectModal({ open: true, item: drv, type: 'DRIVER' })} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 11.5 }}>
                          <Eye size={13} style={{ marginRight: 4 }} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY SECTION (DISPATCHERS) */}
      {(activeTab === 'ALL' || activeTab === 'DISPATCHER') && historyDispatchers.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden', opacity: 0.85 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(107, 114, 128, 0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="var(--text-secondary)" />
            <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
              Dispatcher Decision History ({historyDispatchers.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Dispatcher</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>NID / Phone</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Payment Info</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>Final Outcome</th>
                  <th style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyDispatchers.map(disp => {
                  const isApproved = disp.verification_status === 'Verified' || disp.verification_status === 'Approved';
                  return (
                    <tr key={`hist-${disp.dispatcher_id}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{disp.dispatcher_name || disp.username}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: #{disp.dispatcher_id}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 11.5 }}>{disp.nid_number || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{disp.dispatcher_reg_phone}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{disp.transaction_id || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{disp.payment_status || 'Pending'}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                          background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isApproved ? '#10b981' : '#ef4444'
                        }}>
                          {disp.verification_status}
                        </span>
                        {disp.refund_status === 'Refunded' && (
                          <div style={{ fontSize: 10, marginTop: 4, color: '#10b981', fontWeight: 700 }}>✅ Refund Settled</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button onClick={() => setInspectModal({ open: true, item: disp, type: 'DISPATCHER' })} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 11.5 }}>
                          <Eye size={13} style={{ marginRight: 4 }} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {inspectModal.open && inspectModal.item && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 20,
            maxWidth: 680,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 26,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye color="var(--blue)" size={22} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>
                  Detailed Credential Dossier ({inspectModal.type})
                </h3>
              </div>
              <button
                onClick={() => setInspectModal({ open: false, item: null, type: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Details */}
            {inspectModal.type === 'DRIVER' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Driver Full Name</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{inspectModal.item.driver_name}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Registered Phone</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{inspectModal.item.driver_reg_phone}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>National ID (NID)</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{inspectModal.item.nid_number || 'Not Submitted'}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Driving License Number</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{inspectModal.item.license_no || 'Pending'}</div>
                  </div>
                </div>

                {/* Linked Payment Audit */}
                <div style={{ padding: 14, borderRadius: 12, background: 'rgba(10, 132, 255, 0.08)', border: '1px solid rgba(10, 132, 255, 0.25)' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue)', marginBottom: 6 }}>
                    💳 Linked Verification Fee Transaction
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 12 }}>
                    <div><strong>TrxID:</strong> {inspectModal.item.transaction_id || 'None'}</div>
                    <div><strong>Paid From:</strong> {inspectModal.item.refund_sender_number || inspectModal.item.driver_reg_phone}</div>
                    <div><strong>Amount Paid:</strong> ৳{inspectModal.item.amount_paid || 0}</div>
                    <div><strong>Status:</strong> {inspectModal.item.payment_status || 'Pending'}</div>
                  </div>
                </div>

                {/* Certificates */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                    📜 Professional Paramedic & Training Certificates ({inspectModal.item.submissions?.length || 0})
                  </div>
                  {inspectModal.item.submissions && inspectModal.item.submissions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {inspectModal.item.submissions.map((sub, sIdx) => (
                        <div key={sIdx} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{sub.certificate_name}</div>
                          <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                            {sub.issuing_authority && `Issuer: ${sub.issuing_authority} • `}
                            {sub.serial_number && `Serial: ${sub.serial_number} • `}
                            {sub.valid_until && `Valid Until: ${sub.valid_until}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No additional certificates attached.</div>
                  )}
                </div>
              </div>
            ) : (
              /* DISPATCHER DETAILS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dispatcher Name</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{inspectModal.item.dispatcher_name || inspectModal.item.username}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Registered Phone</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{inspectModal.item.dispatcher_reg_phone || 'N/A'}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>National ID (NID)</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{inspectModal.item.nid_number || 'Not Submitted'}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Account Created</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{new Date(inspectModal.item.registered_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Linked Payment Audit */}
                <div style={{ padding: 14, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', marginBottom: 6 }}>
                    💳 Linked Verification Fee Transaction
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 12 }}>
                    <div><strong>TrxID:</strong> {inspectModal.item.transaction_id || 'None'}</div>
                    <div><strong>Paid From:</strong> {inspectModal.item.refund_sender_number || inspectModal.item.dispatcher_reg_phone}</div>
                    <div><strong>Amount Paid:</strong> ৳{inspectModal.item.amount_paid || 0}</div>
                    <div><strong>Status:</strong> {inspectModal.item.payment_status || 'Pending'}</div>
                  </div>
                </div>

                {/* HSC & Qualifications */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                    🎓 Education Clearances & Certifications ({inspectModal.item.verifications?.length || 0})
                  </div>
                  {inspectModal.item.verifications && inspectModal.item.verifications.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {inspectModal.item.verifications.map((v, vIdx) => {
                        let extras = [];
                        try {
                          extras = typeof v.extra_qualifications === 'string' ? JSON.parse(v.extra_qualifications) : (v.extra_qualifications || []);
                        } catch (e) {}

                        return (
                          <div key={vIdx} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                              🎓 HSC Record — Board: {v.education_board} ({v.hsc_passing_year})
                            </div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                              Roll: {v.hsc_roll_number || 'N/A'} • Reg: {v.hsc_registration_number || 'N/A'}
                            </div>

                            {extras.length > 0 && (
                              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Additional Credentials:</div>
                                {extras.map((ex, exI) => (
                                  <div key={exI} style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                                    • {ex.degree_name || ex.certificate_name} ({ex.institute || ex.issuing_authority || ''})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No qualifications submitted yet.</div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectModal({ open: false, item: null, type: null })}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectModal({
                    open: true,
                    item: inspectModal.item,
                    type: inspectModal.type,
                    reason: 'Under-Payment (৳৫০০ এর কম পরিশোধিত)',
                    customNotes: '',
                    markRefund: true
                  });
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                Reject & Refund
              </button>
              <button
                type="button"
                onClick={() => handleApprove(inspectModal.item, inspectModal.type)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                1-Click Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION ACTION MODAL */}
      {rejectModal.open && rejectModal.item && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <form onSubmit={handleRejectSubmit} style={{
            background: 'var(--bg-card)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 20,
            maxWidth: 540,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 50px rgba(239, 68, 68, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle color="#ef4444" size={22} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#ef4444' }}>
                  Reject Application & Issue 48h Refund
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, item: null, type: null, reason: '', customNotes: '', markRefund: true })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Rejecting applicant: <strong>{rejectModal.type === 'DRIVER' ? rejectModal.item.driver_name : rejectModal.item.dispatcher_name}</strong>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Linked Sender Phone: <strong>{rejectModal.item.refund_sender_number || 'N/A'}</strong> (TrxID: {rejectModal.item.transaction_id || 'N/A'})
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 800, display: 'block', marginBottom: 6 }}>
                Preset Rejection Reason Template *
              </label>
              <select
                value={rejectModal.reason}
                onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                className="form-input form-select"
                style={{ height: 40, borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}
              >
                <option value="Under-Payment (৳৫০০ এর কম পরিশোধিত)">Under-Payment (৳৫০০ এর কম পরিশোধিত)</option>
                <option value="Invalid / Expired Driving License">Invalid / Expired Driving License</option>
                <option value="NID & Profile Data Mismatch">NID & Profile Data Mismatch</option>
                <option value="Unverified Educational / Paramedic Certificate">Unverified Educational / Paramedic Certificate</option>
                <option value="Other (Custom Reason)">Other (Custom Reason)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 800, display: 'block', marginBottom: 6 }}>
                Custom Bengali Notice for Applicant's Inbox (Editable)
              </label>
              <textarea
                rows={4}
                value={rejectModal.customNotes}
                onChange={e => setRejectModal(prev => ({ ...prev, customNotes: e.target.value }))}
                placeholder="যেমন: আপনার প্রেরিত ভেরিফিকেশন ফি অসম্পূর্ণ হওয়ায় আবেদনটি বাতিল করা হলো। ৪৮ ঘণ্টার মধ্যে টাকা রিফান্ড পাবেন।"
                className="form-input"
                style={{ borderRadius: 8, fontSize: 12.5, padding: 10 }}
              />
            </div>

            <div style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: 12,
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <input
                type="checkbox"
                checked={rejectModal.markRefund}
                onChange={e => setRejectModal(prev => ({ ...prev, markRefund: e.target.checked }))}
                id="refund_check"
              />
              <label htmlFor="refund_check" style={{ fontWeight: 800, cursor: 'pointer' }}>
                ☑ Mark for 48h Refund to Sender Phone: {rejectModal.item.refund_sender_number || rejectModal.item.driver_reg_phone || 'Registered Phone'}
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRejectModal({ open: false, item: null, type: null, reason: '', customNotes: '', markRefund: true })}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 900,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Confirm Rejection & Dispatch Notice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REFUND SETTLEMENT MODAL */}
      {refundModal.open && refundModal.item && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <form onSubmit={handleRefundSubmit} style={{
            background: 'var(--bg-card)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 20,
            maxWidth: 500,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 50px rgba(16, 185, 129, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw color="#10b981" size={22} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#10b981' }}>
                  Execute 48h Refund Settlement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundModal({ open: false, item: null, type: null, refundTrxId: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Send money via bKash/Rocket to sender number: <strong>{refundModal.item.refund_sender_number || 'N/A'}</strong> (Amount: ৳{refundModal.item.amount_paid || 0})
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 800, display: 'block', marginBottom: 6 }}>
                Bank/MFS Refund Transaction ID (TrxID) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BKL892189JA"
                value={refundModal.refundTrxId}
                onChange={e => setRefundModal(prev => ({ ...prev, refundTrxId: e.target.value }))}
                className="form-input"
                style={{ height: 42, borderRadius: 10, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRefundModal({ open: false, item: null, type: null, refundTrxId: '' })}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 900,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Confirm Refund Settled
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
