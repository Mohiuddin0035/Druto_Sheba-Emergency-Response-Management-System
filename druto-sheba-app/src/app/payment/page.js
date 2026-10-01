'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, CreditCard, ArrowLeft, Info, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function PaymentGateway() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const purpose = searchParams.get('purpose') || 'General_Payment';
  const entityId = searchParams.get('id') || '';
  const regPhone = searchParams.get('phone') || '';
  const amount = searchParams.get('amount') || '0';
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [method, setMethod] = useState('bKash');
  const [trxId, setTrxId] = useState('');
  const [inputRegPhone, setInputRegPhone] = useState(regPhone);
  const [senderPhone, setSenderPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (regPhone) setInputRegPhone(regPhone);
  }, [regPhone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          entityId,
          registeredPhone: inputRegPhone,
          senderPhone,
          transactionId: trxId,
          method,
          amount
        })
      });

      if (!res.ok) {
        throw new Error('Payment submission failed');
      }

      setCountdown(3);
    } catch (err) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.replace(returnUrl);
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown, router, returnUrl]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 480, width: '100%', background: 'var(--bg-primary)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ background: 'var(--blue)', color: 'white', padding: '24px 20px', textAlign: 'center', position: 'relative' }}>
          <Link href={returnUrl} style={{ position: 'absolute', left: 20, top: 24, color: 'white' }}>
            <ArrowLeft size={24} />
          </Link>
          <ShieldCheck size={48} style={{ margin: '0 auto 10px', opacity: 0.9 }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Druto Sheba Secure Payment</h2>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            Ref: {purpose.replace(/_/g, ' ')} #{entityId}
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Method Toggle */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => setMethod('bKash')}
              style={{
                flex: 1, padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14,
                border: method === 'bKash' ? '2px solid #E2136E' : '1px solid var(--border-subtle)',
                background: method === 'bKash' ? 'rgba(226, 19, 110, 0.05)' : 'transparent',
                color: method === 'bKash' ? '#E2136E' : 'var(--text-muted)'
              }}
            >
              bKash
            </button>
            <button
              onClick={() => setMethod('Rocket')}
              style={{
                flex: 1, padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14,
                border: method === 'Rocket' ? '2px solid #8C1515' : '1px solid var(--border-subtle)',
                background: method === 'Rocket' ? 'rgba(140, 21, 21, 0.05)' : 'transparent',
                color: method === 'Rocket' ? '#8C1515' : 'var(--text-muted)'
              }}
            >
              Rocket
            </button>
          </div>

          {/* Instructions */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-primary)', fontWeight: 700 }}>
              <Info size={16} /> Payment Instructions
            </div>
            <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Open your <strong>{method}</strong> App or dial USSD.</li>
              <li>Go to "Send Money" or "Payment".</li>
              <li>Enter Druto Sheba Account: <strong style={{ color: 'var(--blue)' }}>01778229006</strong></li>
              <li>Enter Amount: <strong style={{ color: 'var(--red)' }}>৳{parseFloat(amount).toLocaleString()}</strong></li>
              <li>Complete the transaction and copy the <strong>TrxID</strong>.</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Transaction ID</label>
              <input
                required
                type="text"
                placeholder={`Enter ${method} TrxID`}
                value={trxId}
                onChange={e => setTrxId(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-accent)', background: 'var(--bg-secondary)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Registered Phone Number</label>
              <input
                readOnly
                type="text"
                value={inputRegPhone}
                onClick={() => alert("This field can't be changed. It is automatically linked to your account.")}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', cursor: 'not-allowed' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Sender {method} Number (For Refund)</label>
              <input
                required
                type="text"
                placeholder="e.g. 01XXXXXXXXX"
                value={senderPhone}
                onChange={e => setSenderPhone(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-accent)', background: 'var(--bg-secondary)', fontSize: 15, fontWeight: 600 }}
              />
            </div>

            <button
              disabled={isSubmitting || countdown > 0}
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: 16, fontSize: 15, fontWeight: 800, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (isSubmitting || countdown > 0) ? 0.7 : 1 }}
            >
              {countdown > 0 ? (
                <>Redirecting in {countdown}...</>
              ) : isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> Verifying...</>
              ) : (
                <><CheckCircle size={18} /> VERIFY PAYMENT</>
              )}
            </button>
          </form>
        </div>
      </div>

      {countdown > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 9999, animation: 'fadeIn 0.3s ease-out' }}>
          <style>{`
            @keyframes popIn {
              0% { transform: scale(0.8); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes spinCircle {
              100% { transform: rotate(360deg); }
            }
          `}</style>
          
          <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '40px', borderRadius: '24px', textAlign: 'center', maxWidth: '360px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(52, 199, 89, 0.2)', borderTopColor: 'var(--green)', animation: 'spinCircle 1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={40} style={{ color: 'var(--green)' }} />
              </div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px' }}>Payment Submitted!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
              Your transaction is being verified by our secure gateway.
            </p>

            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Redirecting in {countdown} seconds</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading payment gateway...</div>}>
      <PaymentGateway />
    </Suspense>
  );
}
