'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/lib/UserContext';
import { 
  CreditCard, CheckCircle2, AlertCircle, TrendingUp, 
  Percent, ShieldCheck, Truck, History, ArrowRight, RefreshCw
} from 'lucide-react';

export default function DriverBillPay() {
  const { activeDriver } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (!activeDriver?.id) return;
    try {
      if (isFirstLoad.current) setLoading(true);
      const res = await fetch(`/api/driver/settlement?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching driver settlement data:', err);
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [activeDriver]);

  useAutoRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPaymentPlaceholder = () => {
    setShowModal(true);
  };

  if (!activeDriver) return null;

  const tier = data?.commission_tier || { rate_pct: 25, category: 'Company Ambulance + Certificate', driver_share_pct: 75 };
  const today = data?.active_today || { total_trips: 0, total_cash_collected: 0, platform_commission_payable: 0, driver_net_income: 0, trips: [], is_settled: false };
  const pastList = Array.isArray(data?.history) ? data.history : [];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>Driver Commission & Bill Pay</h2>
            <span style={{ 
              fontSize: 11, 
              fontWeight: 800, 
              padding: '4px 10px', 
              borderRadius: 20, 
              background: 'rgba(255, 159, 10, 0.15)', 
              color: 'var(--orange)',
              border: '1px solid rgba(255, 159, 10, 0.3)'
            }}>
              {tier.rate_pct}% Commission Tier
            </span>
          </div>
          <p className="page-header-sub">
            Review patient cash collections and settle Druto Sheba's daily operating commission
          </p>
        </div>

        <button 
          onClick={fetchData}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 14px' }}
        >
          <RefreshCw size={14} /> Refresh Ledger
        </button>
      </div>

      {paymentSuccessMsg && (
        <div style={{ 
          background: 'rgba(52, 199, 89, 0.15)', 
          border: '1px solid rgba(52, 199, 89, 0.4)', 
          color: 'var(--green)', 
          padding: '12px 16px', 
          borderRadius: 12, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 700,
          fontSize: 13
        }}>
          <CheckCircle2 size={18} />
          <span>{paymentSuccessMsg}</span>
          <button 
            onClick={() => setPaymentSuccessMsg('')} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Commission Category & Ownership Banner */}
      <div className="glass" style={{ padding: '16px 20px', borderRadius: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 159, 10, 0.15)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Active Fleet Category</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {tier.category}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ambulance Ownership</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {data?.driver?.is_own_ambulance ? `Own (${data.driver.ambulance_plate})` : 'Company Fleet'}
            </div>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Medical Certification</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: data?.driver?.is_certified ? 'var(--green)' : 'var(--text-muted)' }}>
              {data?.driver?.is_certified ? 'Certified Emergency Driver' : 'Standard Driver'}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Card 1: Today's Collection */}
        <div className="section-card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Today's Collection
              </span>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--orange)', marginTop: 6 }}>
                ৳{today.total_cash_collected.toLocaleString()}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {today.total_trips} trip{today.total_trips !== 1 ? 's' : ''} completed today
              </p>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255, 159, 10, 0.12)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
            Paid in cash directly by patients
          </div>
        </div>

        {/* Card 2: Druto Sheba Commission */}
        <div className="section-card" style={{ padding: 20, position: 'relative', overflow: 'hidden', border: today.platform_commission_payable > 0 && !today.is_settled ? '1px solid rgba(255, 69, 58, 0.4)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Druto Sheba Commission
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(255, 69, 58, 0.15)', color: 'var(--red)', padding: '2px 6px', borderRadius: 4 }}>
                  {tier.rate_pct}%
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: today.is_settled ? 'var(--green)' : 'var(--red)', marginTop: 6 }}>
                ৳{today.platform_commission_payable.toLocaleString()}
              </div>
              <p style={{ fontSize: 12, color: today.is_settled ? 'var(--green)' : 'var(--red)', marginTop: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {today.is_settled ? (
                  <>
                    <CheckCircle2 size={13} /> Settled
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} /> Outstanding Balance
                    {today.prior_overdue_commission > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--orange)', marginLeft: 4 }}>
                        (Incl. past overdue ৳{today.prior_overdue_commission.toLocaleString()})
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: today.is_settled ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 69, 58, 0.12)', color: today.is_settled ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={22} />
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {today.is_settled ? 'All dues cleared' : 'End-of-day settlement'}
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary"
              disabled={today.is_settled}
              style={{
                fontSize: 11,
                padding: '6px 12px',
                background: today.is_settled ? 'rgba(255,255,255,0.08)' : 'var(--red)',
                borderColor: today.is_settled ? 'rgba(255,255,255,0.1)' : 'var(--red)',
                color: today.is_settled ? 'var(--text-muted)' : '#fff',
                cursor: today.is_settled ? 'not-allowed' : 'pointer',
                opacity: today.is_settled ? 0.6 : 1
              }}
            >
              Pay Commission
            </button>
          </div>
        </div>

        {/* Card 3: Driver Net Income */}
        <div className="section-card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Your Net Earnings Today
              </span>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)', marginTop: 6 }}>
                ৳{today.driver_net_income.toLocaleString()}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {tier.driver_share_pct}% retained after platform fee
              </p>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(52, 199, 89, 0.12)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--green)', borderTop: '1px solid var(--border-color)', paddingTop: 8, fontWeight: 600 }}>
            Your pure take-home revenue
          </div>
        </div>
      </div>

      {/* Today's Trips Breakdown Table */}
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={18} style={{ color: 'var(--orange)' }} /> Today's Dispatches & Cash Collection Breakdown
        </h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Destination</th>
                <th>Distance</th>
                <th>Gross Cash</th>
                <th>Platform {tier.rate_pct}%</th>
                <th>Your Net</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20 }}>Loading today's dispatches...</td></tr>
              ) : today.trips.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No completed trips recorded today yet.</td></tr>
              ) : (
                today.trips.map((t) => (
                  <tr key={t.trip_id}>
                    <td style={{ fontWeight: 600 }}>#{t.trip_id}</td>
                    <td>{t.time}</td>
                    <td>{t.patient_name}</td>
                    <td>{t.hospital_name}</td>
                    <td>{t.distance_km} km</td>
                    <td style={{ fontWeight: 700, color: 'var(--orange)' }}>৳{t.gross_collected.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>৳{t.platform_commission.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>৳{t.driver_net.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Past Daily Settlements History Table */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} style={{ color: 'var(--blue)' }} /> Past Daily Commission Settlements Log
        </h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Settlement Date</th>
                <th>Trips</th>
                <th>Total Cash Collected</th>
                <th>Tier Applied</th>
                <th>Commission Paid</th>
                <th>Net Driver Income</th>
                <th>Status</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {pastList.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No past settlements recorded yet.</td></tr>
              ) : (
                pastList.map((s) => (
                  <tr key={s.settlement_id}>
                    <td style={{ fontWeight: 600 }}>{s.date}</td>
                    <td>{s.total_trips} trips</td>
                    <td style={{ fontWeight: 700 }}>৳{s.total_cash_collected.toLocaleString()}</td>
                    <td>
                      <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: 4 }}>
                        {s.commission_rate_pct}% ({s.commission_category})
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>৳{s.platform_commission_amount.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>৳{s.driver_net_earnings.toLocaleString()}</td>
                    <td>
                      {s.payment_status === 'Settled' || Number(s.due_amount || 0) === 0 ? (
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          color: 'var(--green)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <CheckCircle2 size={12} />
                          Settled
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          color: 'var(--orange)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <AlertCircle size={12} />
                          Due ৳{Math.round(Number(s.due_amount !== undefined ? s.due_amount : s.platform_commission_amount)).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.payment_method}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Commission Modal (Clickable placeholder with confirmation) */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div className="glass" style={{
            maxWidth: 460,
            width: '100%',
            padding: 28,
            borderRadius: 18,
            border: '1.5px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 69, 58, 0.15)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>Settle Daily Platform Fee</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Druto Sheba Operating Commission</p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Cash Collected Today:</span>
                <span style={{ fontWeight: 700 }}>৳{today.total_cash_collected.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Commission Rate ({tier.category}):</span>
                <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{tier.rate_pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Your Retained Net Income:</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>৳{today.driver_net_income.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-color)', fontSize: 15, fontWeight: 800 }}>
                <span>Commission Payable Now:</span>
                <span style={{ color: 'var(--red)' }}>৳{today.platform_commission_payable.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <button 
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 700 }}
                onClick={() => {
                  window.location.href = `/payment?purpose=Driver_Daily_Settlement&id=${activeDriver?.id}&phone=${activeDriver?.phone || ''}&amount=${today.platform_commission_payable}&returnUrl=/bill-pay`;
                }}
              >
                Make Payment
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowModal(false)} 
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
