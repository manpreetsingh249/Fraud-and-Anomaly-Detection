import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Cpu, 
  Sliders, 
  Send, 
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Search,
  Activity,
  Layers,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  Info
} from 'lucide-react';
import { predictSingle } from '../services/api';
import ConfusionMatrixCard from '../components/ConfusionMatrixCard';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';

export default function FraudDetectionView({ 
  analysisData, 
  onRunAnalysis, 
  loading,
  selectedModel,
  setSelectedModel,
  activeDataset,
  evaluations,
  datasetInspection,
  error
}) {
  // Table Filtering & Pagination
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'high_risk', 'fraud_only', 'legit_only', 'mismatched'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Single transaction testing state
  const [testAmount, setTestAmount] = useState(250.0);
  const [testTime, setTestTime] = useState(120.0);
  const [testV14, setTestV14] = useState(-4.5);
  const [testV17, setTestV17] = useState(-3.2);
  const [singleResult, setSingleResult] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState(null);

  const handleTestSingle = async () => {
    setSingleLoading(true);
    setSingleError(null);
    try {
      const payload = {
        Time: parseFloat(testTime) || 0.0,
        Amount: parseFloat(testAmount) || 0.0,
        supervised_model: selectedModel,
        run_anomaly_detection: true,
        features: {
          V1: -2.0,
          V2: 1.5,
          V3: -2.5,
          V4: 2.1,
          V14: parseFloat(testV14) || 0.0,
          V17: parseFloat(testV17) || 0.0
        }
      };
      const res = await predictSingle(payload);
      setSingleResult(res);
    } catch (err) {
      setSingleError(err.response?.data?.detail || err.message || 'Inference failed');
    } finally {
      setSingleLoading(false);
    }
  };

  const results = analysisData?.results || [];
  const hasGroundTruth = Boolean(analysisData?.has_ground_truth);
  const evaluation = analysisData?.evaluation;

  // Filter calculations
  const highRiskResults = results.filter(r => r.risk_level === 'High' || r.fraud_prediction === 1);
  const fraudOnlyResults = results.filter(r => r.fraud_prediction === 1);
  const legitOnlyResults = results.filter(r => r.fraud_prediction === 0);
  const mismatchedResults = results.filter(r => r.ground_truth !== null && r.ground_truth !== undefined && r.fraud_prediction !== r.ground_truth);

  let filteredList = results;
  if (filterMode === 'high_risk') filteredList = highRiskResults;
  else if (filterMode === 'fraud_only') filteredList = fraudOnlyResults;
  else if (filterMode === 'legit_only') filteredList = legitOnlyResults;
  else if (filterMode === 'mismatched') filteredList = mismatchedResults;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredList = filteredList.filter(item => 
      String(item.index).includes(q) || 
      String(item.Amount).includes(q) ||
      item.risk_level.toLowerCase().includes(q)
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pageResults = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="fade-in">
      {/* Educational Banner */}
      <div className="concept-alert" style={{ borderLeftColor: 'var(--danger)' }}>
        <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="concept-alert-title" style={{ color: '#991B1B' }}>
            Supervised Fraud Classification Engine
          </div>
          <div className="concept-alert-text">
            Supervised models are trained on historical records with ground-truth fraud labels (<code>Class = 1</code>). The model computes continuous calibrated probabilities P(Fraud) between 0.0 and 1.0. Transactions with probability &ge; 0.50 are classified as fraud, with risk tiers: <strong>High</strong> (&ge; 70%), <strong>Medium</strong> (25% - 70%), and <strong>Low</strong> (&lt; 25%).
          </div>
        </div>
      </div>

      {/* Control & Execution Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <Cpu size={18} color="#0D9488" />
            <span>Classification Configuration & Target Dataset</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              Target: <strong style={{ color: 'var(--text-main)' }}>{activeDataset || 'sample_creditcard.csv'}</strong>
            </span>
            {hasGroundTruth ? (
              <span className="badge badge-low" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} /> Operation A: Labeled Ground Truth
              </span>
            ) : (
              <span className="badge badge-med" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Info size={12} /> Operation B: Unlabeled Prediction
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Algorithm:</label>
            <select 
              className="input-control" 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ minWidth: 280 }}
            >
              <option value="random_forest">Random Forest Classifier (Ensemble Trees)</option>
              <option value="logistic_regression">Logistic Regression (Calibrated Baseline)</option>
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => onRunAnalysis(selectedModel)}
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : <RefreshCw size={15} />}
            <span>{loading ? "Evaluating Transactions..." : "Run Supervised Classification"}</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="dashboard-card" style={{ borderColor: 'var(--danger-border)', background: '#FEF2F2' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#B91C1C' }}>Classification Failed</div>
              <div style={{ fontSize: 13, color: '#DC2626', marginTop: 4 }}>{error}</div>
              <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 8 }}>
                Check that your dataset contains the 30 numerical PCA columns (Time, V1..V28, Amount). If columns are named differently, the system auto-maps common aliases.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner spinner-teal" style={{ width: 32, height: 32, margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
            Processing Dataset & Calculating Fraud Probabilities...
          </h4>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 520, margin: '6px auto 0' }}>
            Scaling features with RobustScaler, scoring transactions through {selectedModel === 'random_forest' ? 'Random Forest ensemble trees' : 'Logistic Regression weights'}, and segmenting risk tiers.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !analysisData && !error && (
        <div className="dashboard-card">
          <EmptyState 
            icon={Database}
            title="No Supervised Analysis Results Yet"
            description={`Dataset '${activeDataset || 'sample_creditcard.csv'}' is loaded. Click below to execute the supervised machine learning pipeline.`}
            actionLabel="Run Classification Now"
            onAction={() => onRunAnalysis(selectedModel)}
            actionIcon={ShieldAlert}
          />
        </div>
      )}

      {/* Success / Actual Results State */}
      {!loading && analysisData && (
        <>
          {/* KPI Summary Cards */}
          <div className="metrics-grid">
            <MetricCard 
              title="Total Evaluated"
              value={analysisData.total_records.toLocaleString()}
              subtitle="Transactions Scored"
              icon={Layers}
              color="#0D9488"
              bgLight="#F0FDFA"
            />
            <MetricCard 
              title="Predicted Fraud"
              value={analysisData.fraud_detected_count.toLocaleString()}
              subtitle={`${analysisData.fraud_percentage}% Fraud Detection Rate`}
              icon={ShieldAlert}
              color="#DC2626"
              bgLight="#FEF2F2"
            />
            <MetricCard 
              title="Predicted Normal"
              value={(analysisData.total_records - analysisData.fraud_detected_count).toLocaleString()}
              subtitle={`${(100 - analysisData.fraud_percentage).toFixed(2)}% Legitimate Volume`}
              icon={CheckCircle2}
              color="#16A34A"
              bgLight="#F0FDF4"
            />
            <MetricCard 
              title="Risk Segmentation"
              value={`${analysisData.risk_counts?.High || 0}H / ${analysisData.risk_counts?.Medium || 0}M / ${analysisData.risk_counts?.Low || 0}L`}
              subtitle="High (≥70%) / Med / Low Tiers"
              icon={Activity}
              color="#D97706"
              bgLight="#FFFBEB"
            />
          </div>

          {/* Operation A: Ground Truth Evaluation Metrics */}
          {hasGroundTruth && evaluation?.is_labeled && (
            <div className="dashboard-card" style={{ borderColor: 'var(--primary-border)' }}>
              <div className="card-header">
                <div className="card-title">
                  <BarChart3 size={18} color="#0D9488" />
                  <span>Operation A: Supervised Evaluation Metrics (Ground Truth 'Class' Present)</span>
                </div>
                <span className="badge badge-low">
                  Actual Fraud: {evaluation.actual_fraud_count || 0} | Actual Legitimate: {evaluation.actual_legitimate_count || (analysisData.total_records - (evaluation.actual_fraud_count || 0))}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>PRECISION</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0D9488', marginTop: 4 }}>
                    {(evaluation.precision * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>TP / (TP + FP)</div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>RECALL</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>
                    {(evaluation.recall * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>TP / (TP + FN)</div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>F1-SCORE</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                    {evaluation.f1_score.toFixed(3)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>Harmonic Mean</div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>PR-AUC</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>
                    {evaluation.pr_auc !== null && evaluation.pr_auc !== undefined ? evaluation.pr_auc.toFixed(3) : 'N/A'}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>Area under PR curve</div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>ACCURACY</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                    {(evaluation.accuracy * 100).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>Overall Accuracy</div>
                </div>
              </div>

              {/* Confusion Matrix Display */}
              {evaluation.confusion_matrix && (
                <ConfusionMatrixCard 
                  matrix={evaluation.confusion_matrix} 
                  title={`Confusion Matrix: ${selectedModel === 'random_forest' ? 'Random Forest' : 'Logistic Regression'} on ${activeDataset || 'Dataset'}`}
                />
              )}
            </div>
          )}

          {/* Operation B: Unlabeled Notice */}
          {(!hasGroundTruth || !evaluation?.is_labeled) && (
            <div className="dashboard-card" style={{ borderColor: 'var(--warning-border)', background: '#FFFBEB' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Info size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#B45309' }}>
                    Operation B: Unlabeled Dataset Prediction Mode
                  </div>
                  <div style={{ fontSize: 13, color: '#78350F', marginTop: 4, lineHeight: 1.5 }}>
                    This dataset contains no ground-truth <code>Class</code> labels. The model applied trained weights to infer continuous fraud probabilities P(Fraud) and assigned risk tiers (High / Medium / Low). 
                    <strong> Ground-truth evaluation metrics (Precision, Recall, Confusion Matrix) are intentionally omitted because no true labels exist.</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Single Transaction Simulator */}
          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-title">
                <Sliders size={18} color="#D97706" />
                <span>Interactive Single Transaction Risk Simulator</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Simulate PCA shifts in real-time</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount ($)</label>
                <input 
                  type="number" 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={testAmount} 
                  onChange={(e) => setTestAmount(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Time Offset (Seconds)</label>
                <input 
                  type="number" 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={testTime} 
                  onChange={(e) => setTestTime(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>V14 Component (Key Fraud Driver)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={testV14} 
                  onChange={(e) => setTestV14(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>V17 Component (Secondary Driver)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={testV17} 
                  onChange={(e) => setTestV17(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#F9FAFB', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleTestSingle}
                disabled={singleLoading}
              >
                {singleLoading ? <div className="spinner" /> : <Send size={15} />}
                <span>Evaluate Single Transaction</span>
              </button>

              {singleError && (
                <div style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} />
                  {singleError}
                </div>
              )}

              {singleResult && !singleError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 6 }}>Probability:</span>
                    <strong style={{ fontSize: 16, color: singleResult.fraud_probability >= 0.5 ? '#DC2626' : '#16A34A' }}>
                      {(singleResult.fraud_probability * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 6 }}>Risk Tier:</span>
                    <span className={`badge ${singleResult.risk_level === 'High' ? 'badge-high' : singleResult.risk_level === 'Medium' ? 'badge-med' : 'badge-low'}`}>
                      {singleResult.risk_level}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 6 }}>Classification:</span>
                    <strong style={{ color: singleResult.fraud_prediction === 1 ? '#DC2626' : '#16A34A' }}>
                      {singleResult.fraud_prediction === 1 ? 'FRAUD (1)' : 'LEGITIMATE (0)'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Filterable Transaction Table */}
          <div className="dashboard-card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="card-title">
                <ListFilter size={18} color="#0D9488" />
                <span>Classified Transactions Table ({filteredList.length} Matching)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Search Tx ID or Amount..." 
                    className="input-control" 
                    style={{ paddingLeft: 30, fontSize: 13, height: 36 }}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 10, top: 11 }} />
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="filter-pills-bar">
              <button 
                className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => { setFilterMode('all'); setCurrentPage(1); }}
              >
                All Records ({results.length})
              </button>
              <button 
                className={`filter-pill ${filterMode === 'high_risk' ? 'active' : ''}`}
                onClick={() => { setFilterMode('high_risk'); setCurrentPage(1); }}
              >
                Flagged High Risk ({highRiskResults.length})
              </button>
              <button 
                className={`filter-pill ${filterMode === 'fraud_only' ? 'active' : ''}`}
                onClick={() => { setFilterMode('fraud_only'); setCurrentPage(1); }}
              >
                Predicted Fraud ({fraudOnlyResults.length})
              </button>
              <button 
                className={`filter-pill ${filterMode === 'legit_only' ? 'active' : ''}`}
                onClick={() => { setFilterMode('legit_only'); setCurrentPage(1); }}
              >
                Normal / Legit ({legitOnlyResults.length})
              </button>
              {hasGroundTruth && (
                <button 
                  className={`filter-pill ${filterMode === 'mismatched' ? 'active' : ''}`}
                  onClick={() => { setFilterMode('mismatched'); setCurrentPage(1); }}
                >
                  Classification Errors ({mismatchedResults.length})
                </button>
              )}
            </div>

            {/* Table */}
            <div className="table-responsive" style={{ maxHeight: 460 }}>
              <table>
                <thead>
                  <tr>
                    <th>Tx ID</th>
                    <th>Time (s)</th>
                    <th>Amount ($)</th>
                    <th>Fraud Probability</th>
                    <th>Risk Tier</th>
                    <th>Model Decision</th>
                    <th>Ground Truth</th>
                    {hasGroundTruth && <th>Evaluation Match</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageResults.length > 0 ? (
                    pageResults.map((item) => {
                      const isMatch = item.ground_truth !== null && item.fraud_prediction === item.ground_truth;
                      const isFalsePositive = item.ground_truth === 0 && item.fraud_prediction === 1;
                      const isFalseNegative = item.ground_truth === 1 && item.fraud_prediction === 0;

                      return (
                        <tr key={item.index}>
                          <td><strong>#{item.index}</strong></td>
                          <td>{item.Time}s</td>
                          <td><strong>${item.Amount.toFixed(2)}</strong></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 64, height: 6, borderRadius: 3, background: '#E4E7EC', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${Math.min(100, Math.max(0, item.fraud_probability * 100))}%`, 
                                  height: '100%', 
                                  background: item.fraud_probability >= 0.7 ? '#DC2626' : item.fraud_probability >= 0.25 ? '#D97706' : '#16A34A' 
                                }} />
                              </div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                {(item.fraud_probability * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${item.risk_level === 'High' ? 'badge-high' : item.risk_level === 'Medium' ? 'badge-med' : 'badge-low'}`}>
                              {item.risk_level}
                            </span>
                          </td>
                          <td>
                            {item.fraud_prediction === 1 ? (
                              <span className="badge badge-high">Fraud (1)</span>
                            ) : (
                              <span className="badge badge-low">Normal (0)</span>
                            )}
                          </td>
                          <td>
                            {item.ground_truth !== null && item.ground_truth !== undefined ? (
                              item.ground_truth === 1 ? (
                                <span style={{ color: '#DC2626', fontWeight: 600 }}>Fraud (1)</span>
                              ) : (
                                <span style={{ color: '#16A34A', fontWeight: 600 }}>Normal (0)</span>
                              )
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>Unlabeled</span>
                            )}
                          </td>
                          {hasGroundTruth && (
                            <td>
                              {isMatch ? (
                                <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 600 }}>✓ Correct</span>
                              ) : isFalsePositive ? (
                                <span style={{ color: '#DC2626', fontSize: 12, fontWeight: 600 }}>✗ False Positive</span>
                              ) : isFalseNegative ? (
                                <span style={{ color: '#D97706', fontSize: 12, fontWeight: 600 }}>✗ Missed Fraud</span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={hasGroundTruth ? 8 : 7}>
                        <EmptyState 
                          icon={ListFilter}
                          title="No Matching Transactions"
                          description={`No transaction records match the active filter '${filterMode}'.`}
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
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredList.length)} of {filteredList.length} records
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
        </>
      )}
    </div>
  );
}
