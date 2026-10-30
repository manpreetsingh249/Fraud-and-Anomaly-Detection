import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Trash2, 
  Database, 
  CheckCircle2, 
  AlertOctagon,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Clock,
  RefreshCw
} from 'lucide-react';
import { exportResultsCsv, exportSummaryPdf, deleteAnalysisRun, clearAnalysisHistory } from '../services/api';
import EmptyState from '../components/EmptyState';

/** Simple inline modal confirmation dialog — replaces window.confirm() */
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.55)', 
      zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '28px 32px', 
        maxWidth: 440, width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <AlertTriangle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#101828', marginBottom: 6 }}>
              Confirm Action
            </div>
            <div style={{ fontSize: 13.5, color: '#475467', lineHeight: 1.55 }}>
              {message}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            <X size={14} />
            <span>Cancel</span>
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <Trash2 size={14} />
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsView({ 
  analysisData, 
  history, 
  onRefreshHistory, 
  evaluations, 
  activeDataset 
}) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const [deleteError, setDeleteError] = useState(null);

  const showFeedback = (msg, isError = false) => {
    if (isError) {
      setExportError(msg);
      setExportSuccess(null);
    } else {
      setExportSuccess(msg);
      setExportError(null);
    }
    setTimeout(() => { setExportError(null); setExportSuccess(null); }, 5000);
  };

  const handleDownloadCsv = async () => {
    if (!analysisData?.results?.length) {
      showFeedback('No transaction results available. Run an analysis first to generate exportable records.', true);
      return;
    }
    setDownloadingCsv(true);
    setExportError(null);
    try {
      await exportResultsCsv(analysisData.results, 'full_audit_export');
      showFeedback('CSV export downloaded successfully.');
    } catch (err) {
      showFeedback('CSV export failed: ' + (err.response?.data?.detail || err.message), true);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setExportError(null);
    try {
      const runData = {
        total_records: analysisData?.total_records || 0,
        supervised_model: analysisData?.supervised_model || 'random_forest',
        fraud_detected_count: analysisData?.fraud_detected_count || 0,
        fraud_percentage: analysisData?.fraud_percentage || 0,
        anomaly_detected_count: analysisData?.anomaly_detected_count || 0,
        anomaly_percentage: analysisData?.anomaly_percentage || 0,
        risk_counts: analysisData?.risk_counts || { High: 0, Medium: 0, Low: 0 }
      };
      await exportSummaryPdf(runData, 'Fraud_Detection_Audit_Report.pdf');
      showFeedback('PDF audit report generated and downloaded successfully.');
    } catch (err) {
      showFeedback('PDF generation failed: ' + (err.response?.data?.detail || err.message), true);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDeleteRun = (id) => {
    setConfirmDialog({
      message: `Permanently delete analysis run #${id} from the SQLite database? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteAnalysisRun(id);
          onRefreshHistory();
        } catch (err) {
          setDeleteError('Failed to delete run: ' + (err.response?.data?.detail || err.message));
          setTimeout(() => setDeleteError(null), 4000);
        }
      }
    });
  };

  const handleClearHistory = () => {
    setConfirmDialog({
      message: 'Clear ALL analysis history records from the SQLite database? This permanently removes all saved analysis runs and cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await clearAnalysisHistory();
          onRefreshHistory();
        } catch (err) {
          setDeleteError('Failed to clear history: ' + (err.response?.data?.detail || err.message));
          setTimeout(() => setDeleteError(null), 4000);
        }
      }
    });
  };

  return (
    <div className="fade-in">
      {/* Confirmation Modal */}
      {confirmDialog && (
        <ConfirmDialog 
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Feedback Banners */}
      {exportSuccess && (
        <div style={{
          padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
          color: '#15803D', fontSize: 13.5, fontWeight: 600
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0, color: '#16A34A' }} />
          {exportSuccess}
        </div>
      )}
      {(exportError || deleteError) && (
        <div style={{
          padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
          color: '#B91C1C', fontSize: 13.5, fontWeight: 600
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1, color: '#DC2626' }} />
          {exportError || deleteError}
        </div>
      )}

      {/* Export Options Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* PDF Formal Audit Report Card */}
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <FileText size={18} color="#0D9488" />
              <span>Formal Academic PDF Audit Summary</span>
            </div>
            <span className="badge badge-primary">ReportLab PDF</span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.55 }}>
            Generates a publication-grade academic audit report containing dataset statistics, held-out model comparison benchmarks, confusion matrices, and discussion of limitations.
          </p>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? <div className="spinner" /> : <Download size={15} />}
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download Formatted PDF Summary'}</span>
          </button>
        </div>

        {/* CSV Raw Data Card */}
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <FileSpreadsheet size={18} color="#16A34A" />
              <span>Full Transaction CSV Export</span>
            </div>
            <span className="badge badge-low">
              {analysisData?.results?.length 
                ? `${analysisData.results.length.toLocaleString()} records ready`
                : 'Run analysis first'}
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.55 }}>
            Download the complete scored transactional records including calibrated fraud probabilities, risk tier assignments, and unsupervised anomaly flags for Pandas or Excel evaluation.
          </p>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%' }}
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || !analysisData?.results?.length}
          >
            {downloadingCsv ? <div className="spinner spinner-teal" /> : <Download size={15} />}
            <span>
              {downloadingCsv 
                ? 'Exporting...' 
                : analysisData?.results?.length 
                  ? `Export ${analysisData.results.length.toLocaleString()} Scored Records (.CSV)` 
                  : 'No Results Available'}
            </span>
          </button>
        </div>
      </div>

      {/* Analysis History Database Table */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <Database size={18} color="#7C3AED" />
            <span>Persistent SQLite Analysis Runs ({history?.length || 0} Saved)</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: 12.5 }}
              onClick={onRefreshHistory}
              title="Reload history from database"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
            {history && history.length > 0 && (
              <button 
                className="btn btn-danger" 
                onClick={handleClearHistory}
                title="Clear all stored run records from SQLite"
              >
                <Trash2 size={14} />
                <span>Reset Database Logs</span>
              </button>
            )}
          </div>
        </div>

        {deleteError && (
          <div style={{ 
            padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 6, marginBottom: 14, fontSize: 13, color: '#B91C1C', 
            display: 'flex', gap: 8, alignItems: 'center'
          }}>
            <AlertTriangle size={14} color="#DC2626" />
            {deleteError}
          </div>
        )}

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Dataset Name</th>
                <th>Total Records</th>
                <th>Supervised Model</th>
                <th>Predicted Fraud</th>
                <th>Detected Anomalies</th>
                <th>High Risk Volume</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history && history.length > 0 ? (
                history.map((run) => (
                  <tr key={run.id}>
                    <td><strong>#{run.id}</strong></td>
                    <td><span style={{ fontWeight: 600 }}>{run.dataset_name}</span></td>
                    <td>{run.total_records.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-primary">
                        {run.supervised_model 
                          ? run.supervised_model.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
                          : 'Random Forest'}
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
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={12} />
                        {new Date(run.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleDeleteRun(run.id)}
                        className="btn-icon"
                        style={{ color: '#DC2626' }}
                        title="Delete Run Record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <EmptyState 
                      icon={Database}
                      title="No Analysis History Recorded"
                      description="No prior analysis runs are saved in the SQLite database. Execute an analysis to start logging runs automatically."
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
