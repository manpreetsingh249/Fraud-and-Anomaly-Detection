import React, { useState } from 'react';
import { 
  SearchCode, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import ConceptAlert from '../components/ConceptAlert';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';

export default function AnomalyDetectionView({ analysisData, evaluations }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const results = analysisData?.results || [];
  const anomalies = results.filter(r => r.anomaly_flag === -1);
  const totalAnalyzed = analysisData?.total_records || 0;
  
  // Find isolation forest evaluation metrics
  const isoEval = evaluations?.evaluations?.find(e => e.model_type === 'isolation_forest');

  // Compute correlation / overlap with fraud
  const overlapCount = anomalies.filter(a => a.fraud_prediction === 1).length;
  const nonFraudAnomalies = anomalies.filter(a => a.fraud_prediction === 0).length;

  // Sorted list
  const sortedAnomalies = [...anomalies].sort((a, b) => a.anomaly_score - b.anomaly_score);
  const totalPages = Math.max(1, Math.ceil(sortedAnomalies.length / pageSize));
  const pageAnomalies = sortedAnomalies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="fade-in">
      {/* Principle Callout */}
      <ConceptAlert type="anomaly_vs_fraud" />

      {/* KPI Cards for Anomaly Engine */}
      <div className="metrics-grid">
        <MetricCard 
          title="Detected Outliers"
          value={anomalies.length.toLocaleString()}
          subtitle={`${totalAnalyzed > 0 ? ((anomalies.length / totalAnalyzed) * 100).toFixed(2) : 0}% of analyzed batch`}
          icon={SearchCode}
          color="#7C3AED"
          bgLight="#F5F3FF"
          animationDelay={0}
        />
        <MetricCard 
          title="Unusual Normal Purchases"
          value={nonFraudAnomalies.toLocaleString()}
          subtitle="Outliers flagged as legitimate commerce"
          icon={AlertTriangle}
          color="#D97706"
          bgLight="#FFFBEB"
          animationDelay={80}
        />
        <MetricCard 
          title="Overlap With Fraud"
          value={overlapCount.toLocaleString()}
          subtitle="Outliers with P(Fraud) ≥ 50%"
          icon={Layers}
          color="#DC2626"
          bgLight="#FEF2F2"
          animationDelay={160}
        />
        <MetricCard 
          title="Algorithm Paradigm"
          value="Unsupervised"
          subtitle="Zero reliance on historical labels"
          icon={Activity}
          color="#0D9488"
          bgLight="#F0FDFA"
          animationDelay={240}
        />
      </div>

      {/* Isolation Forest Theoretical Explanation */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <Activity size={18} color="#7C3AED" />
            <span>How Unsupervised Isolation Forest Operates</span>
          </div>
          <span className="badge badge-anomaly">Tree Partitioning Ensemble</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              1. Recursive Feature Splitting
            </h4>
            <p style={{ lineHeight: 1.55 }}>
              The algorithm constructs an ensemble of 100 randomized trees by selecting random features and random cut-points between the observed feature minimum and maximum.
            </p>
          </div>
          <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              2. Short Path Length Isolation
            </h4>
            <p style={{ lineHeight: 1.55 }}>
              Outliers populate sparse coordinate spaces in the 30-dimensional manifold. Consequently, they require far fewer random splits to isolate, resulting in significantly shorter root-to-leaf path lengths.
            </p>
          </div>
          <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              3. Calibrated Decision Score
            </h4>
            <p style={{ lineHeight: 1.55 }}>
              Negative decision scores indicate statistical outliers ($s(x) &lt; 0$), whereas positive values denote normal clustered activity. No fraud labels are required during execution.
            </p>
          </div>
        </div>
      </div>

      {/* Flagged Anomaly Records Table */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <SearchCode size={18} color="#7C3AED" />
            <span>Flagged Outlier Transactions ({anomalies.length} Records)</span>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Sorted by most negative anomaly score (highest statistical deviation)
          </span>
        </div>

        <div className="table-responsive" style={{ maxHeight: 460 }}>
          <table>
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Time (s)</th>
                <th>Amount ($)</th>
                <th>Anomaly Score</th>
                <th>Outlier Flag</th>
                <th>Supervised Prediction</th>
                <th>Audit Action Guide</th>
              </tr>
            </thead>
            <tbody>
              {pageAnomalies.length > 0 ? (
                pageAnomalies.map((item) => (
                  <tr key={item.index}>
                    <td><strong>#{item.index}</strong></td>
                    <td>{item.Time}s</td>
                    <td><strong>${item.Amount.toFixed(2)}</strong></td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#7C3AED', fontWeight: 600 }}>
                      {item.anomaly_score.toFixed(4)}
                    </td>
                    <td>
                      <span className="badge badge-anomaly">OUTLIER (-1)</span>
                    </td>
                    <td>
                      {item.fraud_prediction === 1 ? (
                        <span className="badge badge-high">Predicted Fraud</span>
                      ) : (
                        <span className="badge badge-low">Predicted Normal</span>
                      )}
                    </td>
                    <td>
                      {item.fraud_prediction === 1 ? (
                        <span style={{ color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ● High Priority (Fraud Match)
                        </span>
                      ) : (
                        <span style={{ color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ● Audit Review (Unusual Commerce)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState 
                      icon={SearchCode}
                      title="No Outliers Flagged"
                      description="No anomalous transactions flagged by Isolation Forest in the current batch. Run analysis on a larger or more diverse dataset."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedAnomalies.length)} of {sortedAnomalies.length} outlier records
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 10px' }}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-main)', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 10px' }}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
