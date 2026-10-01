'use client';
import { useState, useEffect, useCallback } from 'react';
import { Activity, BarChart3, ShieldAlert, Map, TrendingUp, Star, MessageSquare, Clock, Server, Wifi, Cpu, Database } from 'lucide-react';

const SystemHealthMonitor = () => {
  const [health, setHealth] = useState(null);

  const fetchHealth = useCallback(() => {
    fetch(`/api/admin/health?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setHealth(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (!health) return null;

  return (
    <div className="section-card" style={{ marginBottom: 24, background: 'linear-gradient(90deg, rgba(10,132,255,0.05) 0%, rgba(10,132,255,0) 100%)', borderLeft: '4px solid var(--blue)' }}>
      <div className="section-header" style={{ padding: '16px 24px', borderBottom: 'none' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Server size={18} color="var(--blue)" /> Live System Health</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
             <span className="pulse-dot" style={{ background: health.status === 'Healthy' ? 'var(--green)' : 'var(--red)' }} />
             {health.status || 'Unknown'}
          </div>
          {health.timestamp && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated: {new Date(health.timestamp).toLocaleTimeString()}</div>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '0 24px 20px' }}>
        <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Wifi size={24} color="var(--green)" opacity={0.8} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Connections</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{health.activeConnections || 0}</div>
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Cpu size={24} color="var(--orange)" opacity={0.8} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Server Uptime</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              {health.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'N/A'}
            </div>
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Database size={24} color="var(--blue)" opacity={0.8} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DB Latency</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: (health.latency || 0) < 500 ? 'var(--text-primary)' : 'var(--red)' }}>{health.latency || 0}ms</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState({
    hospitalRank: [], zoneAnalysis: [], maintenanceStats: [],
    inventoryAlerts: [], costTrend: [], recentReviews: [],
    responseTime: [], specDist: [], requestTrend: [],
    revenueStats: { current_year_revenue: 0, previous_year_revenue: 0 },
    monthlyRevenue: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(() => {
    fetch(`/api/analytics?t=${Date.now()}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to fetch analytics');
        return r.json();
      })
      .then(json => {
        if (json.error) throw new Error(json.error);
        
        // Defensive data parsing ensuring everything is an array
        setData({
          hospitalRank: Array.isArray(json.hospitalRank) ? json.hospitalRank : [],
          zoneAnalysis: Array.isArray(json.zoneAnalysis) ? json.zoneAnalysis : [],
          maintenanceStats: Array.isArray(json.maintenanceStats) ? json.maintenanceStats : [],
          inventoryAlerts: Array.isArray(json.inventoryAlerts) ? json.inventoryAlerts : [],
          costTrend: Array.isArray(json.costTrend) ? json.costTrend : [],
          recentReviews: Array.isArray(json.recentReviews) ? json.recentReviews : [],
          responseTime: Array.isArray(json.responseTime) ? json.responseTime : [],
          specDist: Array.isArray(json.specDist) ? json.specDist : [],
          requestTrend: Array.isArray(json.requestTrend) ? json.requestTrend : [],
          revenueStats: json.revenueStats || { current_year_revenue: 0, previous_year_revenue: 0 },
          monthlyRevenue: Array.isArray(json.monthlyRevenue) ? json.monthlyRevenue : [],
        });
        setError(null);
      })
      .catch((err) => {
        console.error('Analytics Error:', err);
        setError('Failed to load real-time analytics data. Displaying cached or empty data.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); 
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) {
    return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;
  }

  const totalCost = data.maintenanceStats.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);
  const avgRequests = data.zoneAnalysis.length > 0 ? (data.zoneAnalysis.reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0) / data.zoneAnalysis.length) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>System Analytics</h2>
          <p className="page-header-sub">Advanced insights and system health</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, background: 'rgba(255,59,48,0.1)', color: 'var(--red)', borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
          {error}
        </div>
      )}

      <SystemHealthMonitor />

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Maintenance Cost</div>
          <div className="stat-card-value">৳{totalCost.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Requests / Zone</div>
          <div className="stat-card-value">{avgRequests.toFixed(1)}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="stat-card-label">{new Date().getFullYear()} Revenue</div>
          <div className="stat-card-value" style={{ color: 'var(--green)' }}>৳{(parseFloat(data.revenueStats.current_year_revenue) || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--text-muted)' }}>
          <div className="stat-card-label">{new Date().getFullYear() - 1} Revenue</div>
          <div className="stat-card-value" style={{ color: 'var(--text-muted)' }}>৳{(parseFloat(data.revenueStats.previous_year_revenue) || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="content-grid">
        
        {/* Hospital Rankings */}
        <div className="section-card">
          <div className="section-header">
            <h3><BarChart3 size={16} /> Hospital ICU Ranking</h3>
          </div>
          <div className="section-body">
            {data.hospitalRank.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Hospital</th>
                    <th>ICU Beds</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hospitalRank.map((h, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 800, color: i === 0 ? 'var(--yellow)' : 'inherit' }}>#{h.icu_rank || (i + 1)}</td>
                      <td>{h.name || 'Unknown'}</td>
                      <td>{h.icu_beds || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No data available</div>
            )}
          </div>
        </div>

        {/* Zones */}
        <div className="section-card">
          <div className="section-header">
            <h3><Map size={16} /> Emergencies by Zone ({new Date().getFullYear()})</h3>
          </div>
          <div className="section-body" style={{ padding: 20 }}>
            {data.zoneAnalysis.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.zoneAnalysis.map((z, i) => {
                  const maxVal = Math.max(...data.zoneAnalysis.map(d => parseInt(d.count) || 0), 1);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.zone_name || 'Zone'}</div>
                      <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${((parseInt(z.count) || 0) / maxVal) * 100}%`, height: '100%', background: i === 0 ? 'var(--red)' : 'var(--blue)', borderRadius: 6 }} />
                      </div>
                      <div style={{ width: 30, fontSize: 11, fontWeight: 700 }}>{z.count || 0}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
               <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data available</div>
            )}
          </div>
        </div>

        {/* Monthly Revenue Graph */}
        <div className="section-card">
          <div className="section-header">
            <h3><TrendingUp size={16} /> Monthly Revenue ({new Date().getFullYear()})</h3>
          </div>
          <div className="section-body" style={{ padding: 20 }}>
            {data.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: 4, overflowX: 'auto', paddingBottom: 10, paddingTop: 10 }}>
                {data.monthlyRevenue.map((d, i) => {
                   const maxVal = Math.max(...data.monthlyRevenue.map(x => parseFloat(x.revenue) || 0), 100); // minimum scale 100
                   const heightPct = Math.max(((parseFloat(d.revenue) || 0) / maxVal) * 100, 2); // minimum 2% height
                   return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flex: 1, minWidth: 20, height: '100%' }}>
                      
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: -2, height: 14, display: 'flex', alignItems: 'flex-end' }}>
                         {parseFloat(d.revenue) > 0 ? (parseFloat(d.revenue) > 1000 ? `${(parseFloat(d.revenue)/1000).toFixed(1)}k` : d.revenue) : ''}
                      </div>

                      <div style={{ width: '100%', maxWidth: 30, height: `calc(${heightPct}% - 40px)`, minHeight: '4px', background: 'var(--green)', borderRadius: '4px 4px 0 0' }} />
                      
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'center' }}>{d.month}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data available</div>
            )}
          </div>
        </div>

        {/* Specialization */}
        <div className="section-card">
          <div className="section-header">
            <h3><Activity size={16} /> Specialization ({new Date().getFullYear()})</h3>
          </div>
          <div className="section-body" style={{ padding: 20 }}>
             {data.specDist.length > 0 ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                 {data.specDist.map((d, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                     <span style={{ color: 'var(--text-secondary)' }}>{d.spec || 'General'}</span>
                     <span style={{ fontWeight: 800 }}>{d.count || 0}</span>
                   </div>
                 ))}
               </div>
             ) : (
               <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data available</div>
             )}
          </div>
        </div>

        {/* Maintenance Tracking */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><Activity size={16} /> Maintenance Cost Tracking</h3>
          </div>
          <div className="section-body">
            {data.maintenanceStats.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Service Type</th>
                    <th>Cost</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.maintenanceStats.map((m, i) => (
                    <tr key={i}>
                      <td>{m.license_plate || 'N/A'}</td>
                      <td>{m.maintenance_type || 'General'}</td>
                      <td>৳{m.cost || 0}</td>
                      <td>{m.date_started ? new Date(m.date_started).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No data available</div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><ShieldAlert size={16} /> Low Inventory Alerts</h3>
          </div>
          <div className="section-body">
             {data.inventoryAlerts.length > 0 ? (
                <div className="cards-grid">
                  {data.inventoryAlerts.map((v, i) => (
                    <div className="card" key={i} style={{ borderColor: v.status === 'LOW' ? 'var(--red)' : 'var(--border-subtle)' }}>
                       <div className="card-header">
                          <span className="card-title">{v.item_name || 'Item'}</span>
                          <span className={`badge ${v.status === 'LOW' ? 'badge-critical' : 'badge-low'}`}>{v.status || 'OK'}</span>
                       </div>
                       <div className="card-body">
                          <div className="card-row">
                            <span className="card-row-label">Ambulance</span>
                            <span className="card-row-value">{v.license_plate || 'Unknown'}</span>
                          </div>
                          <div className="card-row">
                            <span className="card-row-label">Stock / Status</span>
                            <span className="card-row-value" style={{ color: v.status === 'LOW' ? 'var(--red)' : 'inherit' }}>
                              {v.item_name === 'Oxygen Level (%)' 
                                ? `${v.quantity || 0}%` 
                                : v.item_name === 'Defibrillator'
                                  ? (v.quantity > 0 ? 'Ready' : 'Needs Service')
                                  : v.item_name === 'Basic Supplies'
                                    ? (v.quantity > 0 ? 'Stocked' : 'Low')
                                    : `${v.quantity || 0} units`}
                            </span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
             ) : (
                <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>No low inventory alerts.</div>
             )}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><MessageSquare size={16} /> Recent Patient Feedback</h3>
          </div>
          <div className="section-body">
            {data.recentReviews.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, padding: 24 }}>
                {data.recentReviews.map((r, i) => (
                  <div key={i} className="glass" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{r.patient_name || 'Anonymous'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Trip #{r.trip_id || 'N/A'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[...Array(5)].map((_, idx) => (
                          <Star key={idx} size={14} fill={idx < (r.rating || 0) ? 'var(--yellow)' : 'none'} stroke={idx < (r.rating || 0) ? 'var(--yellow)' : 'var(--text-muted)'} />
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>"{r.comments || 'No comments left.'}"</p>
                    <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                No feedback received yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
