import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X,
  ShieldCheck,
  ShieldAlert,
  SearchCode
} from 'lucide-react';
import { exportResultsCsv } from '../services/api';
import EmptyState from '../components/EmptyState';

export default function TransactionExplorerView({ analysisData, activeDataset, onToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [fraudFilter, setFraudFilter] = useState('ALL');
  const [anomalyFilter, setAnomalyFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const rawResults = analysisData?.results || [];

  // Filter logic
  const filtered = useMemo(() => {
    return rawResults.filter((item) => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = String(item.index).includes(term);
        const matchesAmount = String(item.Amount).includes(term);
        if (!matchesId && !matchesAmount) return false;
      }
      // Risk level
      if (riskFilter !== 'ALL' && item.risk_level !== riskFilter) {
        return false;
      }
      // Fraud
      if (fraudFilter !== 'ALL') {
        const expected = fraudFilter === 'FRAUD' ? 1 : 0;
        if (item.fraud_prediction !== expected) return false;
      }
      // Anomaly
      if (anomalyFilter !== 'ALL') {
        const expected = anomalyFilter === 'OUTLIER' ? -1 : 1;
        if (item.anomaly_flag !== expected) return false;
      }
      return true;
    });
  }, [rawResults, searchTerm, riskFilter, fraudFilter, anomalyFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageIndex = Math.min(currentPage, totalPages);
  const displayed = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageIndex, pageSize]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportResultsCsv(filtered, 'filtered_transactions');
      onToast('Filtered transactions exported successfully.', 'success');
    } catch (err) {
      onToast(`Export failed: ${err.response?.data?.detail || err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Search & Filter Bar */}
      <div className="dashboard-card">
        <div className="card-header" style={{ marginBottom: 18 }}>
          <div className="card-title">
            <Filter size={18} color="#0D9488" />
            <span>Search & Filter Engine ({filtered.length} of {rawResults.length} Matched)</span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handleExport}
            disabled={filtered.length === 0 || isExporting}
            title="Export currently filtered rows to CSV"
          >
            <Download size={15} />
            <span>{isExporting ? 'Exporting…' : 'Export Filtered CSV'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {/* Search Input */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Search Tx ID or Amount
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input-control" 
                placeholder="e.g. 104 or 450.00" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%', paddingLeft: 32 }}
              />
              <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 10, top: 12 }} />
            </div>
          </div>

          {/* Risk Tier */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Risk Tier
            </label>
            <select 
              className="input-control" 
              style={{ width: '100%' }}
              value={riskFilter} 
              onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="High">High Risk (≥ 70%)</option>
              <option value="Medium">Medium Risk (25-70%)</option>
              <option value="Low">Low Risk (&lt; 25%)</option>
            </select>
          </div>

          {/* Fraud Prediction */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Supervised Fraud
            </label>
            <select 
              className="input-control" 
              style={{ width: '100%' }}
              value={fraudFilter} 
              onChange={(e) => { setFraudFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Classifications</option>
              <option value="FRAUD">Predicted Fraud (1)</option>
              <option value="NORMAL">Predicted Normal (0)</option>
            </select>
          </div>

          {/* Anomaly Outlier */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Unsupervised Outliers
            </label>
            <select 
              className="input-control" 
              style={{ width: '100%' }}
              value={anomalyFilter} 
              onChange={(e) => { setAnomalyFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Transactions</option>
              <option value="OUTLIER">Isolation Forest Outliers (-1)</option>
              <option value="INLIER">Normal Inliers (1)</option>
            </select>
          </div>

          {/* Page Size */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Rows Per Page
            </label>
            <select 
              className="input-control" 
              style={{ width: '100%' }}
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={15}>15 Rows</option>
              <option value={25}>25 Rows</option>
              <option value={50}>50 Rows</option>
              <option value={100}>100 Rows</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="dashboard-card">
        <div className="table-responsive" style={{ maxHeight: 520 }}>
          <table>
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Time (s)</th>
                <th>Amount ($)</th>
                <th>Fraud Probability</th>
                <th>Risk Tier</th>
                <th>Supervised Decision</th>
                <th>Anomaly Score</th>
                <th>Anomaly Flag</th>
                <th>Ground Truth</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length > 0 ? (
                displayed.map((item) => (
                  <tr key={item.index}>
                    <td><strong>#{item.index}</strong></td>
                    <td>{item.Time}s</td>
                    <td><strong>${item.Amount.toFixed(2)}</strong></td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {(item.fraud_probability * 100).toFixed(1)}%
                      </span>
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
                    <td style={{ fontFamily: 'var(--font-mono)', color: item.anomaly_score < 0 ? '#7C3AED' : 'var(--text-secondary)' }}>
                      {item.anomaly_score.toFixed(4)}
                    </td>
                    <td>
                      {item.anomaly_flag === -1 ? (
                        <span className="badge badge-anomaly">OUTLIER</span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Normal</span>
                      )}
                    </td>
                    <td>
                      {item.ground_truth !== null && item.ground_truth !== undefined ? (
                        item.ground_truth === 1 ? (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>Fraud (1)</span>
                        ) : (
                          <span style={{ color: '#16A34A', fontWeight: 600 }}>Legit (0)</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Unlabeled</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setSelectedTx(item)}
                        title="Inspect full feature diagnostics"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10}>
                    <EmptyState 
                      icon={Filter}
                      title="No Matching Transactions"
                      description="No records matched your search query or active filter settings."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="pagination-bar">
          <div>
            Showing <strong>{((pageIndex - 1) * pageSize) + (displayed.length > 0 ? 1 : 0)}</strong> to <strong>{Math.min(pageIndex * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> records
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px' }}
              disabled={pageIndex <= 1} 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '0 8px' }}>
              Page <strong>{pageIndex}</strong> of <strong>{totalPages}</strong>
            </span>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px' }}
              disabled={pageIndex >= totalPages} 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(16, 24, 40, 0.65)', 
          backdropFilter: 'blur(4px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 100 
        }}
        onClick={() => setSelectedTx(null)}
        >
          <div style={{ 
            background: '#FFFFFF', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-lg)', 
            width: '90%', 
            maxWidth: 600, 
            padding: 24, 
            maxHeight: '90vh', 
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>
                Transaction Audit Details #{selectedTx.index}
              </h3>
              <button 
                onClick={() => setSelectedTx(null)} 
                className="btn-icon"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Amount</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                  ${selectedTx.Amount.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Time Offset</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                  {selectedTx.Time}s
                </div>
              </div>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Fraud Probability</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: selectedTx.fraud_probability >= 0.5 ? '#DC2626' : '#16A34A', marginTop: 2 }}>
                  {(selectedTx.fraud_probability * 100).toFixed(2)}%
                </div>
              </div>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Anomaly Score</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: selectedTx.anomaly_score < 0 ? '#7C3AED' : '#16A34A', marginTop: 2 }}>
                  {selectedTx.anomaly_score.toFixed(4)}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Classification Diagnostics
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.6 }}>
                This transaction was assigned to the <strong style={{ color: selectedTx.risk_level === 'High' ? '#DC2626' : selectedTx.risk_level === 'Medium' ? '#D97706' : '#16A34A' }}>{selectedTx.risk_level} Risk</strong> tier. 
                {selectedTx.anomaly_flag === -1 ? (
                  <span> It is simultaneously flagged as an <strong>Unsupervised Outlier</strong> by Isolation Forest due to abnormal multi-dimensional feature distance.</span>
                ) : (
                  <span> Its multivariate feature distance falls within standard baseline boundaries.</span>
                )}
                {selectedTx.ground_truth !== null && (
                  <span> Historical benchmark ground truth confirms this transaction was actual <strong>{selectedTx.ground_truth === 1 ? 'FRAUD (1)' : 'LEGITIMATE (0)'}</strong>.</span>
                )}
              </p>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 20 }}
              onClick={() => setSelectedTx(null)}
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
