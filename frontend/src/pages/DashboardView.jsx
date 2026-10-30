import React from 'react';
import { 
  CreditCard, 
  ShieldAlert, 
  SearchCode, 
  Play, 
  ArrowUpRight,
  Clock,
  Sparkles,
  AlertOctagon,
  Layers,
  Inbox
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import ConceptAlert from '../components/ConceptAlert';
import RiskDistributionChart from '../components/RiskDistributionChart';
import EmptyState from '../components/EmptyState';

export default function DashboardView({ 
  analysisData, 
  history, 
  onRunAnalysis, 
  loading, 
  onNavigate,
  activeDataset 
}) {
  const totalAnalyzed = analysisData?.total_records || 0;
  const fraudDetected = analysisData?.fraud_detected_count || 0;
  const fraudPct = analysisData?.fraud_percentage || 0;
  const anomalyDetected = analysisData?.anomaly_detected_count || 0;
  const anomalyPct = analysisData?.anomaly_percentage || 0;
  const riskCounts = analysisData?.risk_counts || { Low: 0, Medium: 0, High: 0 };
  const hasGroundTruth = Boolean(analysisData?.has_ground_truth);

  return (
    <div className="fade-in">
      {/* Educational Banner */}
      <ConceptAlert type="accuracy_fallacy" />

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Transactions Analyzed" 
          value={totalAnalyzed.toLocaleString()} 
          subtitle="Processed through dual ML pipeline"
          icon={CreditCard}
          color="#0D9488"
          bgLight="#F0FDFA"
          animationDelay={0}
        />
        <MetricCard 
          title="Predicted Fraud Cases" 
          value={fraudDetected.toLocaleString()} 
          subtitle={`${fraudPct}% classified as fraud (P ≥ 0.50)`}
          icon={ShieldAlert}
          color="#DC2626"
          bgLight="#FEF2F2"
          animationDelay={80}
        />
        <MetricCard 
          title="Detected Anomalies" 
          value={anomalyDetected.toLocaleString()} 
          subtitle={`${anomalyPct}% statistical novelties`}
          icon={SearchCode}
          color="#D97706"
          bgLight="#FFFBEB"
          animationDelay={160}
        />
        <MetricCard 
          title="High Risk Volume" 
          value={riskCounts.High.toLocaleString()} 
          subtitle="Transactions with P(Fraud) ≥ 70%"
          icon={AlertOctagon}
          color="#7C3AED"
          bgLight="#F5F3FF"
          animationDelay={240}
        />
      </div>

      {/* Interactive Batch Evaluation Control & Risk Visualizer */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <Sparkles size={18} color="#0D9488" />
            <span>Interactive Batch Evaluation Control</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              Active Dataset: <strong style={{ color: 'var(--text-main)' }}>{activeDataset || 'sample_creditcard.csv'}</strong>
            </span>
            <button 
              className="btn btn-primary" 
              onClick={onRunAnalysis} 
              disabled={loading}
              title="Execute prediction and anomaly pipeline on active dataset"
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Evaluating Pipeline...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>Execute Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {totalAnalyzed > 0 ? (
          <RiskDistributionChart 
            total={totalAnalyzed}
            riskCounts={riskCounts}
            fraudCount={fraudDetected}
            anomalyCount={anomalyDetected}
          />
        ) : (
          <EmptyState 
            icon={Layers}
            title="Pipeline Ready For Execution"
            description={`Dataset '${activeDataset || 'sample_creditcard.csv'}' is selected. Click 'Execute Analysis' to run both supervised classification and unsupervised anomaly detection.`}
            actionLabel="Execute Analysis"
            onAction={onRunAnalysis}
            actionIcon={Play}
          />
        )}
      </div>

      {/* Core Principle Alert */}
      <ConceptAlert type="anomaly_vs_fraud" />

      {/* Recent Analysis Runs Table */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={18} color="#7C3AED" />
            <span>Recent Analysis History (SQLite Stored)</span>
          </div>
          <button className="btn btn-secondary" onClick={() => onNavigate('reports')}>
            <span>View Full Audit History</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Dataset Name</th>
                <th>Records</th>
                <th>Supervised Model</th>
                <th>Predicted Fraud</th>
                <th>Detected Anomalies</th>
                <th>High Risk Volume</th>
                <th>Execution Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history && history.length > 0 ? (
                history.slice(0, 5).map((run) => (
                  <tr key={run.id}>
                    <td><strong>#{run.id}</strong></td>
                    <td><span style={{ fontWeight: 600 }}>{run.dataset_name}</span></td>
                    <td>{run.total_records.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-primary">
                        {run.supervised_model ? run.supervised_model.replace('_', ' ') : 'Random Forest'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-high">
                        {run.fraud_detected_count} ({run.fraud_percentage}%)
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-med">
                        {run.anomaly_detected_count} ({run.anomaly_percentage}%)
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#DC2626' }}>{run.high_risk_count}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <EmptyState 
                      icon={Inbox}
                      title="No Previous Runs"
                      description="No prior batch predictions have been logged yet. Click 'Execute Analysis' above to record your first run."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
