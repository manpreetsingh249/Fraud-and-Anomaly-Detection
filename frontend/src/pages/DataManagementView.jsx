import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileCheck, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  Sparkles, 
  RefreshCw,
  Eye,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  SearchCode,
  Info,
  CheckCircle2,
  FileUp,
  X
} from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function DataManagementView({ 
  datasets, 
  selectedDataset, 
  onSelectDataset, 
  datasetInspection, 
  onUploadFile, 
  onGenerateSample, 
  loading,
  onNavigate 
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Sample Generator parameters
  const [numSamples, setNumSamples] = useState(1500);
  const [fraudRate, setFraudRate] = useState(0.02);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError("Only CSV files (.csv) are accepted.");
      setSelectedFile(null);
      return;
    }
    setUploadError(null);
    setUploadSuccess(null);
    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a CSV file first.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(0);

    try {
      await onUploadFile(selectedFile, (pct) => setUploadProgress(pct));
      setUploadSuccess(`Successfully uploaded and validated '${selectedFile.name}'!`);
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to upload file.";
      setUploadError(msg);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const validation = datasetInspection?.validation;
  const stats = datasetInspection?.stats;
  const previewRows = datasetInspection?.preview || [];
  const targetInfo = validation?.target_info;
  const isCompatible = validation?.is_valid;
  const hasLabels = stats?.has_ground_truth;

  return (
    <div className="fade-in">
      {/* Upload & Generator Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* CSV Upload Card */}
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <UploadCloud size={18} color="#0D9488" />
              <span>Upload CSV Dataset</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Max 250 MB | RFC 4180 Parser</span>
          </div>

          {/* Drag & Drop Area */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`, 
              borderRadius: 'var(--radius-lg)', 
              padding: '30px 20px', 
              cursor: 'pointer',
              background: dragActive ? 'var(--primary-light)' : '#F9FAFB',
              transition: 'all 0.2s ease',
              textAlign: 'center'
            }}
            onClick={() => document.getElementById('csv-file-input').click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('csv-file-input').click(); }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#F0FDFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              color: 'var(--primary)'
            }}>
              <FileUp size={24} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
              {selectedFile ? selectedFile.name : "Click to Browse or Drag & Drop CSV File"}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {selectedFile 
                ? `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload` 
                : "Supports Kaggle creditcard.csv or any labeled / unlabeled transaction dataset"}
            </span>
            <input 
              id="csv-file-input"
              type="file" 
              accept=".csv" 
              onChange={(e) => handleFileSelect(e.target.files[0])} 
              style={{ display: 'none' }} 
              disabled={loading || isUploading}
            />
          </div>

          {/* File Selected Action Bar */}
          {selectedFile && (
            <div style={{ 
              marginTop: 14, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: 12, 
              background: '#F0FDFA', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--primary-border)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <FileSpreadsheet size={18} color="#0D9488" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button 
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  disabled={isUploading}
                  title="Remove file"
                >
                  <X size={14} />
                </button>
                <button 
                  className="btn btn-primary"
                  style={{ padding: '7px 14px', fontSize: 13 }}
                  onClick={handleExecuteUpload}
                  disabled={isUploading}
                >
                  {isUploading ? <div className="spinner" /> : <UploadCloud size={15} />}
                  <span>{isUploading ? "Uploading..." : "Upload & Validate"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div style={{ marginTop: 14 }}>
              <div className="upload-progress-container">
                <div 
                  className="upload-progress-bar" 
                  style={{ width: `${uploadProgress}%` }} 
                />
              </div>
              <div className="upload-progress-label">
                {uploadProgress < 100 
                  ? `Uploading... ${uploadProgress}%` 
                  : 'Processing & validating dataset...'}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {uploadSuccess && (
            <div style={{ 
              marginTop: 14, 
              padding: '12px 16px', 
              background: '#F0FDF4', 
              border: '1px solid #BBF7D0', 
              borderRadius: 'var(--radius-md)', 
              color: '#15803D', 
              fontSize: 13, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10 
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, color: '#16A34A' }} />
              <div>
                <strong>Upload Succeeded:</strong> {uploadSuccess}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {uploadError && (
            <div style={{ 
              marginTop: 14, 
              padding: '12px 16px', 
              background: '#FEF2F2', 
              border: '1px solid #FECACA', 
              borderRadius: 'var(--radius-md)', 
              color: '#B91C1C', 
              fontSize: 13, 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 10 
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#DC2626' }} />
              <div>
                <strong>Upload / Validation Failed:</strong>
                <div style={{ marginTop: 2, color: '#DC2626' }}>{uploadError}</div>
              </div>
            </div>
          )}
        </div>

        {/* Built-in Benchmark Synthesizer */}
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <Sparkles size={18} color="#D97706" />
              <span>Generate Benchmark Sample Dataset</span>
            </div>
            <span className="badge badge-sample">Instant Testing</span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>
            Synthesize transaction records matching Kaggle's PCA feature schema (Time, V1 through V28, Amount, and Class) with calibrated class imbalance.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Row Count
              </label>
              <select 
                className="input-control" 
                style={{ width: '100%' }}
                value={numSamples} 
                onChange={(e) => setNumSamples(Number(e.target.value))}
              >
                <option value={500}>500 Transactions</option>
                <option value={1500}>1,500 Transactions</option>
                <option value={3000}>3,000 Transactions</option>
                <option value={5000}>5,000 Transactions</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Injected Fraud Ratio
              </label>
              <select 
                className="input-control" 
                style={{ width: '100%' }}
                value={fraudRate} 
                onChange={(e) => setFraudRate(Number(e.target.value))}
              >
                <option value={0.01}>1% (0.01 Imbalance)</option>
                <option value={0.02}>2% (0.02 Imbalance)</option>
                <option value={0.05}>5% (0.05 Imbalance)</option>
              </select>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={() => onGenerateSample(numSamples, fraudRate)}
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : <RefreshCw size={15} />}
            <span>Synthesize Sample Dataset</span>
          </button>
        </div>
      </div>

      {/* Post-Upload / Active Dataset Analysis Launchpad */}
      {datasetInspection && (
        <div className="dashboard-card" style={{ borderColor: 'var(--primary-border)', background: '#FFFFFF' }}>
          <div className="card-header">
            <div className="card-title">
              <FileCheck size={18} color="#0D9488" />
              <span>Analysis Launchpad: '{selectedDataset}'</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              Choose an analysis path for the active dataset
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Option 1: Supervised ML */}
            <div style={{ 
              background: '#FFFFFF', 
              padding: 18, 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldAlert size={16} color="#DC2626" />
                    Supervised Fraud ML
                  </span>
                  {hasLabels ? (
                    <span className="badge badge-low" style={{ fontSize: 10.5 }}>Operation A: Labeled</span>
                  ) : (
                    <span className="badge badge-med" style={{ fontSize: 10.5 }}>Operation B: Unlabeled</span>
                  )}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                  {hasLabels 
                    ? "Evaluates Random Forest and Logistic Regression against ground truth. Displays Precision, Recall, PR-AUC, and Confusion Matrix." 
                    : "Predicts continuous fraud probabilities P(Fraud) and risk tiers (High / Medium / Low). Omits ground truth metrics."}
                </p>
                {!isCompatible && (
                  <div style={{ fontSize: 11.5, color: '#DC2626', marginBottom: 10, fontWeight: 500 }}>
                    ⚠️ Incompatible schema. Requires 30 PCA features.
                  </div>
                )}
              </div>
              <button 
                className="btn btn-primary"
                style={{ width: '100%', padding: '8px 14px' }}
                onClick={() => onNavigate && onNavigate('fraud')}
                disabled={!isCompatible}
              >
                <span>Launch Supervised Classification</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Option 2: Unsupervised Anomaly */}
            <div style={{ 
              background: '#FFFFFF', 
              padding: 18, 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SearchCode size={16} color="#7C3AED" />
                    Unsupervised Outliers
                  </span>
                  <span className="badge badge-anomaly" style={{ fontSize: 10.5 }}>Isolation Forest</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                  Detects statistical outliers and novel behavioral shifts using recursive random partitioning trees without relying on historical labels.
                </p>
                {!isCompatible && (
                  <div style={{ fontSize: 11.5, color: '#DC2626', marginBottom: 10, fontWeight: 500 }}>
                    ⚠️ Incompatible schema. Requires numerical features.
                  </div>
                )}
              </div>
              <button 
                className="btn btn-secondary"
                style={{ width: '100%', padding: '8px 14px' }}
                onClick={() => onNavigate && onNavigate('anomaly')}
                disabled={!isCompatible}
              >
                <span>Launch Anomaly Detection</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Option 3: Exploratory Data Analysis */}
            <div style={{ 
              background: '#FFFFFF', 
              padding: 18, 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileSpreadsheet size={16} color="#0D9488" />
                    Data Explorer (EDA)
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: 10.5 }}>Inspection</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                  Search, paginate, and explore all raw transaction records with PCA distributions, amounts, timestamps, and filter options.
                </p>
              </div>
              <button 
                className="btn btn-secondary"
                style={{ width: '100%', padding: '8px 14px' }}
                onClick={() => onNavigate && onNavigate('explorer')}
              >
                <span>Open Transaction Explorer</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schema & Data Quality Validation Report */}
      {datasetInspection && (
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title">
              <FileCheck size={18} color="#16A34A" />
              <span>Dataset Summary & Schema Validation: {selectedDataset}</span>
            </div>
            {isCompatible ? (
              <span className="badge badge-low">
                <CheckCircle size={12} /> Valid for ML Pipeline
              </span>
            ) : (
              <span className="badge badge-high">
                <AlertCircle size={12} /> Incompatible Schema
              </span>
            )}
          </div>

          {/* Target Label Identification Banner */}
          {targetInfo && (
            <div style={{ 
              marginBottom: 16, 
              padding: '14px 16px', 
              borderRadius: 'var(--radius-md)', 
              background: targetInfo.has_target 
                ? (targetInfo.is_valid_binary ? '#F0FDF4' : '#FFFBEB')
                : '#F0FDFA',
              border: `1px solid ${targetInfo.has_target 
                ? (targetInfo.is_valid_binary ? '#BBF7D0' : '#FDE68A')
                : '#99F6E4'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                <Info size={16} color={targetInfo.has_target ? (targetInfo.is_valid_binary ? '#16A34A' : '#D97706') : '#0D9488'} />
                <span>Target Label Identification:</span>
                <span style={{ color: targetInfo.has_target ? '#15803D' : 'var(--text-secondary)' }}>
                  {targetInfo.has_target ? `'${targetInfo.target_col}' Detected` : 'No Ground-Truth Label Column (Unlabeled)'}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                {targetInfo.message}
              </div>
              {targetInfo.unique_values?.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Sample Unique Label Values: <code>{targetInfo.unique_values.join(', ')}</code>
                </div>
              )}
            </div>
          )}

          {/* Validation Errors & Incompatible Columns Explanation */}
          {validation?.errors?.length > 0 && (
            <div style={{ marginBottom: 16, padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
                Incompatibility Errors & Missing Features:
              </div>
              <ul style={{ paddingLeft: 20, fontSize: 12.5, color: '#B91C1C', lineHeight: 1.6 }}>
                {validation.errors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
              <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 8 }}>
                <strong>How to resolve:</strong> The supervised and anomaly models require 30 benchmark features (Time, V1 through V28, and Amount). Ensure your CSV has these 30 columns. Common aliases (like <code>amt</code>, <code>is_fraud</code>, <code>time</code>) are automatically mapped.
              </div>
            </div>
          )}

          {/* Quality Warnings */}
          {validation?.warnings?.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>Data Quality Notices:</div>
              <ul style={{ paddingLeft: 20, fontSize: 12.5, color: '#B45309' }}>
                {validation.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Quick Stats Grid */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Records</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>{stats.total_rows.toLocaleString()}</div>
              </div>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Feature Columns</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>{stats.total_columns}</div>
              </div>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Ground-Truth Labels</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: stats.has_ground_truth ? '#16A34A' : 'var(--text-secondary)', marginTop: 2 }}>
                  {stats.has_ground_truth ? 'Present (Class)' : 'Unlabeled'}
                </div>
              </div>
              <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Known Fraud Cases</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626', marginTop: 2 }}>
                  {stats.fraud_count !== null && stats.fraud_count !== undefined ? `${stats.fraud_count} (${stats.fraud_percentage}%)` : 'N/A (Unlabeled)'}
                </div>
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Preview (First {previewRows.length} Rows of Actual Ingested Data)
            </h4>
          </div>

          <div className="table-responsive" style={{ maxHeight: 380 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>Amount ($)</th>
                  {stats?.has_ground_truth && <th>Class (Actual)</th>}
                  <th>V1</th>
                  <th>V2</th>
                  <th>V3</th>
                  <th>V4</th>
                  <th>V14</th>
                  <th>V17</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{row.Time !== undefined ? row.Time : '-'}</td>
                    <td><strong>${row.Amount !== undefined ? Number(row.Amount).toFixed(2) : '0.00'}</strong></td>
                    {stats?.has_ground_truth && (
                      <td>
                        {row.Class === 1 ? (
                          <span className="badge badge-high">Fraud (1)</span>
                        ) : (
                          <span className="badge badge-low">Normal (0)</span>
                        )}
                      </td>
                    )}
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.V1 !== undefined ? Number(row.V1).toFixed(4) : '-'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.V2 !== undefined ? Number(row.V2).toFixed(4) : '-'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.V3 !== undefined ? Number(row.V3).toFixed(4) : '-'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.V4 !== undefined ? Number(row.V4).toFixed(4) : '-'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#DC2626', fontWeight: 600 }}>{row.V14 !== undefined ? Number(row.V14).toFixed(4) : '-'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.V17 !== undefined ? Number(row.V17).toFixed(4) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available Datasets Table */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <Database size={18} color="#0D9488" />
            <span>Available Stored Datasets</span>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Files in local <code>data/</code> folder</span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>File Size</th>
                <th>Type Badge</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {datasets && datasets.length > 0 ? (
                datasets.map((d) => {
                  const isSelected = selectedDataset === d.filename;
                  return (
                    <tr key={d.filename} style={{ background: isSelected ? '#F0FDFA' : undefined }}>
                      <td>
                        <strong>{d.filename}</strong>
                        {isSelected && (
                          <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: 11 }}>
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td>{d.size_mb} MB</td>
                      <td>
                        {d.is_sample ? (
                          <span className="badge badge-sample">Sample Synthetic</span>
                        ) : (
                          <span className="badge badge-real">Uploaded Real CSV</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`} 
                          style={{ padding: '6px 12px', fontSize: 12.5 }}
                          onClick={() => onSelectDataset(d.filename)}
                        >
                          <Eye size={13} />
                          <span>{isSelected ? 'Active Dataset' : 'Inspect & Select'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4}>
                    <EmptyState 
                      icon={Database}
                      title="No Datasets Available"
                      description="No dataset files found in the data/ directory. Upload a CSV above or click 'Synthesize Sample Dataset'."
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
