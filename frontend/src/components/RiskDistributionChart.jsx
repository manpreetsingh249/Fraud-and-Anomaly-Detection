import React from 'react';
import { BarChart3, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function RiskDistributionChart({ 
  total = 0, 
  riskCounts = { Low: 0, Medium: 0, High: 0 },
  fraudCount = 0,
  anomalyCount = 0
}) {
  if (total === 0) {
    return null;
  }

  const lowPct = ((riskCounts.Low / total) * 100).toFixed(1);
  const medPct = ((riskCounts.Medium / total) * 100).toFixed(1);
  const highPct = ((riskCounts.High / total) * 100).toFixed(1);

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header with summary numbers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Risk Probability Spectrum ({total.toLocaleString()} transactions evaluated):
        </span>
        <div style={{ display: 'flex', gap: 14, fontSize: 12.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
            Low: <strong style={{ color: '#16A34A' }}>{riskCounts.Low.toLocaleString()}</strong> ({lowPct}%)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706' }} />
            Medium: <strong style={{ color: '#D97706' }}>{riskCounts.Medium.toLocaleString()}</strong> ({medPct}%)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }} />
            High: <strong style={{ color: '#DC2626' }}>{riskCounts.High.toLocaleString()}</strong> ({highPct}%)
          </span>
        </div>
      </div>

      {/* Segmented Distribution Bar */}
      <div style={{
        height: 14,
        borderRadius: 7,
        background: '#F2F4F7',
        overflow: 'hidden',
        display: 'flex',
        boxShadow: 'inset 0 1px 2px rgba(16, 24, 40, 0.08)'
      }}>
        <div 
          style={{ 
            width: `${lowPct}%`, 
            background: '#16A34A', 
            transition: 'width 0.4s ease' 
          }} 
          title={`Low Risk: ${riskCounts.Low.toLocaleString()} (${lowPct}%)`} 
        />
        <div 
          style={{ 
            width: `${medPct}%`, 
            background: '#D97706', 
            transition: 'width 0.4s ease' 
          }} 
          title={`Medium Risk: ${riskCounts.Medium.toLocaleString()} (${medPct}%)`} 
        />
        <div 
          style={{ 
            width: `${highPct}%`, 
            background: '#DC2626', 
            transition: 'width 0.4s ease' 
          }} 
          title={`High Risk (P ≥ 70%): ${riskCounts.High.toLocaleString()} (${highPct}%)`} 
        />
      </div>

      {/* Informative Legend with Threshold Definitions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginTop: 14,
        paddingTop: 12,
        borderTop: '1px solid var(--border-subtle)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <ShieldCheck size={16} color="#16A34A" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-main)' }}>Low Risk (P &lt; 0.25)</strong>
            <div>Standard daily commerce activity within normal baseline.</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertTriangle size={16} color="#D97706" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-main)' }}>Medium Risk (0.25 &le; P &lt; 0.70)</strong>
            <div>Unusual amount or velocity; recommended for secondary verification.</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <ShieldAlert size={16} color="#DC2626" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-main)' }}>High Risk (P &ge; 0.70)</strong>
            <div>Strong mathematical correlation with historical fraud signatures.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
