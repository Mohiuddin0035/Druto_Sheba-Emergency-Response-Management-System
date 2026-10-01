'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { 
  Receipt, 
  Download, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Calendar, 
  Navigation, 
  CreditCard, 
  Banknote,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Building2,
  Phone,
  Truck
} from 'lucide-react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { useUser } from '@/lib/UserContext';

export default function PatientBillsPage() {
  const { activePatient } = useUser();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [payingBillId, setPayingBillId] = useState(null);
  const toast = useToast();

  const fetchBills = useCallback(async () => {
    if (!activePatient?.id) return;
    try {
      const res = await fetch(`/api/patient/bills?patientId=${activePatient.id}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBills(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load patient invoices & bills:', err);
    } finally {
      setLoading(false);
    }
  }, [activePatient]);

  useAutoRefresh(fetchBills);
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handlePayNow = async (billId) => {
    setPayingBillId(billId);
    try {
      const res = await fetch('/api/patient/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      if (res.ok) {
        toast('Bill payment processed successfully!', 'success');
        setBills(prev => prev.map(b => b.bill_id === billId ? { ...b, payment_status: 'Paid' } : b));
      } else {
        toast('Payment transaction failed. Please try again.', 'error');
      }
    } catch (e) {
      toast('Network error during payment.', 'error');
    } finally {
      setPayingBillId(null);
    }
  };

  const totalSpent = bills
    .reduce((sum, b) => sum + (parseFloat(b.driver_cash_paid) || 0), 0);

  if (!activePatient) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>My Invoices & Bills</h2>
          <p className="page-header-sub">
            Review emergency ambulance trip distance, driver fare details, and receipts
          </p>
        </div>
        <div className="live-indicator"><div className="live-dot" /> LIVE LEDGER</div>
      </div>

      {/* Financial Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="section-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
            <Banknote size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Driver Fare Paid</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>৳{Math.round(totalSpent).toLocaleString()}</div>
          </div>
        </div>

        <div className="section-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(10, 132, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
            <Receipt size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Trips Completed</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue)', marginTop: 2 }}>{bills.length}</div>
          </div>
        </div>

        <div className="section-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Unpaid / Due Bills</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)', marginTop: 2 }}>
              0
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Records List */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
        {loading ? (
          <div className="loading-container" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : bills.length > 0 ? (
          bills.map((bill) => {
            const rawDate = bill.timestamp_created || bill.time_dispatched || bill.date_issued;
            const billDate = rawDate 
              ? new Date(rawDate).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })
              : 'Recent';
            
            const dist = parseFloat(bill.distance_km) || 2.5;
            const baseF = bill.base_fare ? parseFloat(bill.base_fare) : 750;
            const perKm = bill.per_km_charge ? parseFloat(bill.per_km_charge) : 25;
            const driverPay = Math.round(parseFloat(bill.driver_cash_paid) || (baseF + dist * perKm));

            return (
              <div 
                key={bill.bill_id} 
                className="section-card" 
                style={{ 
                  padding: '20px 24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: 20,
                  flexWrap: 'wrap',
                  borderLeft: '4px solid var(--green)'
                }}
              >
                {/* Left: Info */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', minWidth: 280, flex: 2 }}>
                  <div style={{ 
                    width: 52, 
                    height: 52, 
                    borderRadius: 14, 
                    background: 'rgba(52, 199, 89, 0.12)', 
                    color: 'var(--green)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0 
                  }}>
                    <FileCheck size={26} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)' }}>
                        Receipt #INV-{bill.bill_id}
                      </span>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 800, 
                        padding: '3px 8px', 
                        borderRadius: 6, 
                        background: 'rgba(56, 189, 248, 0.12)', 
                        color: 'var(--blue)',
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}>
                        Trip #{bill.trip_id}
                      </span>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 900, 
                        padding: '3px 10px', 
                        borderRadius: 6, 
                        background: 'rgba(52, 199, 89, 0.15)', 
                        color: 'var(--green)',
                        border: '1px solid rgba(52, 199, 89, 0.4)'
                      }}>
                        ✓ PAID TO DRIVER
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: 13, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={14} /> {billDate}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={14} color="var(--red)" /> Destination: <strong>{bill.hospital_name}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--blue)', fontWeight: 700 }}>
                        <Navigation size={14} /> Distance: {dist} KM
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: 2 }}>
                      <span>👤 Driver: <strong style={{ color: 'var(--text-primary)' }}>{bill.driver_name}</strong></span>
                      <span>🚑 Vehicle: <strong style={{ color: 'var(--text-primary)' }}>{bill.ambulance_plate}</strong></span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Base Fare + (Distance × Rate)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amounts & Download Invoice Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 800 }}>
                      Paid to Driver
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)' }}>
                      ৳{driverPay}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Distance: {dist} km
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedInvoice({
                          ...bill,
                          totalBill: driverPay,
                          driverPay,
                          dist,
                          billDate
                        });
                        setShowInvoiceModal(true);
                      }}
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                      title="View & Download PDF Invoice"
                    >
                      <Download size={15} /> Invoice
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="section-card">
            <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
              <Receipt size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3>No Invoices or Bills Found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                When you request emergency ambulances, distance calculation, paid driver fare receipts, and invoices will be cataloged here automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modern Printable / Downloadable Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title={`Official Invoice #INV-${selectedInvoice?.bill_id}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={16} /> Download / Print PDF
            </button>
          </>
        }
      >
        {selectedInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: 24,
              border: '1.5px dashed var(--border-accent)',
              borderRadius: 14,
              background: 'var(--bg-card)',
              color: 'var(--text-primary)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--blue)' }}>DRUTO SHEBA EMERGENCY</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Government Certified Fast Response System</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: selectedInvoice.payment_status === 'Paid' ? 'rgba(52,199,89,0.2)' : 'rgba(255,159,10,0.2)',
                    color: selectedInvoice.payment_status === 'Paid' ? 'var(--green)' : 'var(--yellow)',
                    border: `1px solid ${selectedInvoice.payment_status === 'Paid' ? 'var(--green)' : 'var(--yellow)'}`
                  }}>
                    {selectedInvoice.payment_status === 'Paid' ? 'PAID INVOICE' : 'PAYMENT DUE'}
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Date: {selectedInvoice.billDate}</div>
                </div>
              </div>

              {/* Patient & Trip Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Billed To</div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{activePatient?.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Phone: {activePatient?.phone || 'Emergency Contact'}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Blood Group: {activePatient?.blood_group || 'O+'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Dispatch Details</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>Trip #{selectedInvoice.trip_id}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Hospital: <strong>{selectedInvoice.hospital_name}</strong></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Distance: <strong>{selectedInvoice.distance_km || 2.5} KM</strong></div>
                </div>
              </div>

              {/* Driver & Ambulance Details */}
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', marginBottom: 16, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dispatched Driver: <strong>{selectedInvoice.driver_name}</strong></span>
                  <span>Ambulance Reg: <strong>{selectedInvoice.ambulance_plate}</strong></span>
                </div>
              </div>

              {/* Financial Items Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Ambulance Base Fare</span>
                  <span>৳{selectedInvoice.base_fare ? parseInt(selectedInvoice.base_fare) : 750}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Distance Transit Rate ({selectedInvoice.distance_km || 2.5} KM @ ৳{selectedInvoice.per_km_charge ? parseInt(selectedInvoice.per_km_charge) : 25}/KM)</span>
                  <span>৳{Math.max(0, (selectedInvoice.driverPay || 750) - (selectedInvoice.base_fare ? parseInt(selectedInvoice.base_fare) : 750))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Platform Service Charge</span>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>৳0 (Free for Emergencies)</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px dashed var(--border-subtle)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 17, fontWeight: 900 }}>
                  <span>Total Paid Directly to Driver</span>
                  <span style={{ color: 'var(--green)', fontSize: 22 }}>৳{selectedInvoice.driverPay}</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
