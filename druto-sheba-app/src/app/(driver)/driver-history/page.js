'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

import { History, Star, Clock, MapPin, Banknote } from 'lucide-react';
import { SeverityBadge } from '@/components/Badges';
import { useUser } from '@/lib/UserContext';

export default function DriverHistory() {
  const { activeDriver } = useUser();
  const [data, setData] = useState({ earnings: '৳0', rating: 0, trips: [], monthly_breakdown: [], yearly_reviews: [], current_year: new Date().getFullYear().toString() });
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (!activeDriver?.id) return;
    try {
      if (isFirstLoad.current) {
        setLoading(true);
      }
      const res = await fetch(`/api/driver/history?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        setData({
          earnings: resData?.earnings || '৳0',
          rating: resData?.rating || 0,
          trips: Array.isArray(resData?.trips) ? resData.trips : [],
          monthly_breakdown: Array.isArray(resData?.monthly_breakdown) ? resData.monthly_breakdown : [],
          yearly_reviews: Array.isArray(resData?.yearly_reviews) ? resData.yearly_reviews : [],
          current_year: resData?.current_year || new Date().getFullYear().toString()
        });
      }
    } catch (err) {
      console.error(err);
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

  if (!activeDriver) return null;

  const tripsList = Array.isArray(data?.trips) ? data.trips : [];
  const monthlyList = Array.isArray(data?.monthly_breakdown) ? data.monthly_breakdown : [];
  const yearlyList = Array.isArray(data?.yearly_reviews) ? data.yearly_reviews : [];
  const currentYearStr = data?.current_year || new Date().getFullYear().toString();

  // 1. Current Ongoing Year months (e.g. 2026 months currently active)
  const currentYearMonths = monthlyList.filter(m => (m.year || m.month_key.substring(0, 4)) === currentYearStr);

  // 2. Past Closed Years (e.g. 2026 ends, 2027 starts -> 2026 becomes a closed review card)
  const pastClosedYears = yearlyList.filter(y => y.year !== currentYearStr);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Trip History & Monthly Ledger</h2>
          <p className="page-header-sub">Review your past completed emergency dispatches and monthly earnings breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Earnings</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>{data.earnings || '৳0'}</div>
           </div>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Average Rating</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {data.rating ? (
                  <>
                    <span>{data.rating}</span>
                    <Star size={16} fill="currentColor" />
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>--</span>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Monthly Breakdown & Year-End Review Segment */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Banknote size={18} style={{ color: 'var(--blue)' }} /> Monthly Earnings & Year-End Workload Summary
        </h3>
        {monthlyList.length === 0 ? (
          <div className="glass" style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No monthly payroll records logged yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
            {/* A. Current Year Active Months */}
            {currentYearMonths.map((m) => (
              <div 
                key={m.month_key} 
                className="glass" 
                style={{ 
                  padding: 16, 
                  borderRadius: 12, 
                  border: m.is_over_duty ? '1px solid rgba(255, 69, 58, 0.4)' : '1px solid var(--border-color)',
                  boxShadow: m.is_over_duty ? '0 0 10px rgba(255, 69, 58, 0.15)' : 'none',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{m.month_name}</span>
                  {m.is_over_duty && (
                    <span style={{ fontSize: 10, background: 'rgba(255, 69, 58, 0.2)', color: 'var(--red)', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                      OVERLOAD
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Monthly Earnings:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{m.earnings}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trips Completed:</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.trips_count}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Days:</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.active_days} days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg Daily Duty:</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: m.is_over_duty ? 'var(--red)' : 'var(--blue)' }}>
                    {m.avg_daily_hours}h / day
                  </span>
                </div>
              </div>
            ))}

            {/* B. Past Closed Years Review Cards (When previous year ends and new year starts) */}
            {pastClosedYears.map((yr) => (
              <div 
                key={`yearly-review-${yr.year}`}
                className="glass"
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.08) 0%, rgba(52, 199, 89, 0.05) 100%)',
                  border: '1px solid rgba(10, 132, 255, 0.3)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue)' }}>
                    🎉 {yr.year} Annual Review
                  </span>
                  <span style={{ fontSize: 10, background: 'rgba(10, 132, 255, 0.2)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                    CLOSED YEAR
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Year Revenue:</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{yr.total_earnings}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Dispatches:</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{yr.total_trips} trips</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Days Worked:</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{yr.total_active_days} days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Yearly Avg Duty:</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue)' }}>{yr.yearly_avg_daily_hours}h / day</span>
                </div>

                {/* Month-by-month mini breakdown list inside the year card */}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Monthly Breakdown ({yr.monthly_list.length} active months):
                </div>
                <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
                  {yr.monthly_list.map((mItem) => (
                    <div 
                      key={mItem.month_key} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '3px 6px', 
                        borderRadius: 6, 
                        background: 'rgba(255,255,255,0.03)', 
                        fontSize: 11 
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{mItem.month_name.replace(` ${yr.year}`, '')}:</span>
                      <span>{mItem.trips_count} trips ({mItem.earnings}) • {mItem.avg_daily_hours}h/d</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} style={{ color: 'var(--blue)' }} /> Detailed Trip Logs
        </h3>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Date & Time</th>
              <th>Patient</th>
              <th>Route</th>
              <th>Duration</th>
              <th>Earnings</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>Loading trips...</td></tr>
            ) : tripsList.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No completed trips recorded yet.</td></tr>
            ) : (
              tripsList.map((trip) => (
                <tr key={trip.id}>
                  <td style={{ fontWeight: 600 }}>#{trip.id}</td>
                  <td>{trip.date}</td>
                  <td>{trip.patient}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: 13 }}>{trip.from} → {trip.to}</span>
                    </div>
                  </td>
                  <td><Clock size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--text-muted)' }} />{trip.time}</td>
                  <td style={{ fontWeight: 600, color: 'var(--green)' }}>{trip.fare}</td>
                  <td>
                    {trip.rating !== null && trip.rating !== undefined ? (
                      <div style={{ display: 'flex', gap: 2, color: 'var(--yellow)' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.round(trip.rating) ? 'currentColor' : 'none'} stroke="currentColor" opacity={i < Math.round(trip.rating) ? 1 : 0.3} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 2, color: 'rgba(255, 255, 255, 0.28)' }}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill="none" stroke="currentColor" />
                          ))}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, marginLeft: 2 }}>(Unrated)</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
