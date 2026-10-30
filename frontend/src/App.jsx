import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './pages/DashboardView';
import DataManagementView from './pages/DataManagementView';
import FraudDetectionView from './pages/FraudDetectionView';
import AnomalyDetectionView from './pages/AnomalyDetectionView';
import ModelLabView from './pages/ModelLabView';
import TransactionExplorerView from './pages/TransactionExplorerView';
import ReportsView from './pages/ReportsView';

import { 
  getHealth, 
  listDatasets, 
  previewDataset, 
  uploadDataset, 
  generateSampleDataset, 
  getModelEvaluations, 
  trainModels, 
  predictBatch, 
  getAnalysisHistory 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [health, setHealth] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState('sample_creditcard.csv');
  const [datasetInspection, setDatasetInspection] = useState(null);
  const [evaluations, setEvaluations] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedSupervisedModel, setSelectedSupervisedModel] = useState('random_forest');
  const [toastMessage, setToastMessage] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. Health
      const h = await getHealth().catch(() => null);
      setHealth(h);

      // 2. Datasets
      const dList = await listDatasets().catch(() => []);
      setDatasets(dList);

      let targetDataset = 'sample_creditcard.csv';
      if (dList.some(d => d.filename === 'creditcard.csv')) {
        targetDataset = 'creditcard.csv';
      } else if (dList.length > 0) {
        targetDataset = dList[0].filename;
      }
      setActiveDataset(targetDataset);

      // 3. Inspect dataset
      if (targetDataset) {
        const insp = await previewDataset(targetDataset).catch(() => null);
        setDatasetInspection(insp);
      }

      // 4. Evaluations
      const ev = await getModelEvaluations().catch(() => null);
      setEvaluations(ev);

      // 5. History
      const hist = await getAnalysisHistory().catch(() => []);
      setHistory(hist);

      // 6. Initial Batch Prediction Run for Immediate Demonstration
      if (targetDataset) {
        const batch = await predictBatch({
          filename: targetDataset,
          supervisedModel: 'random_forest',
          runAnomalyDetection: true,
          saveRun: false
        }).catch(() => null);
        if (batch) setAnalysisData(batch);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  const handleSelectDataset = async (filename) => {
    setActiveDataset(filename);
    setLoading(true);
    setAnalysisError(null);
    try {
      const insp = await previewDataset(filename);
      setDatasetInspection(insp);
      showToast(`Selected dataset '${filename}'`, 'success');
      // Automatically run batch analysis for seamless instant results
      try {
        const res = await predictBatch({
          filename,
          supervisedModel: selectedSupervisedModel,
          runAnomalyDetection: true,
          saveRun: false
        });
        setAnalysisData(res);
      } catch (be) {
        setAnalysisError(be.response?.data?.detail || be.message);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setAnalysisError(msg);
      showToast("Error inspecting dataset: " + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file, onProgress) => {
    setLoading(true);
    setAnalysisError(null);
    try {
      const res = await uploadDataset(file, onProgress);
      showToast(`Successfully uploaded ${res.filename}`, 'success');
      const dList = await listDatasets();
      setDatasets(dList);
      setActiveDataset(res.filename);
      setDatasetInspection(res.inspection);
      // Run batch analysis on uploaded dataset
      try {
        const batch = await predictBatch({
          filename: res.filename,
          supervisedModel: selectedSupervisedModel,
          runAnomalyDetection: true,
          saveRun: false
        });
        setAnalysisData(batch);
      } catch (be) {
        setAnalysisError(be.response?.data?.detail || be.message);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Upload failed";
      setAnalysisError(msg);
      showToast(msg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSample = async (numSamples, fraudRate) => {
    setLoading(true);
    setAnalysisError(null);
    try {
      const res = await generateSampleDataset(numSamples, fraudRate);
      showToast(`Generated sample dataset with ${numSamples} records!`, 'success');
      const dList = await listDatasets();
      setDatasets(dList);
      setActiveDataset(res.filename);
      setDatasetInspection(res.inspection);
      // Run batch analysis on sample
      try {
        const batch = await predictBatch({
          filename: res.filename,
          supervisedModel: selectedSupervisedModel,
          runAnomalyDetection: true,
          saveRun: false
        });
        setAnalysisData(batch);
      } catch (be) {
        setAnalysisError(be.response?.data?.detail || be.message);
      }
    } catch (err) {
      showToast("Error creating sample dataset: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (modelOverride = null) => {
    const modelToUse = modelOverride || selectedSupervisedModel;
    setLoading(true);
    setAnalysisError(null);
    try {
      const res = await predictBatch({
        filename: activeDataset,
        supervisedModel: modelToUse,
        runAnomalyDetection: true,
        saveRun: true
      });
      setAnalysisData(res);
      showToast(`Analyzed ${res.total_records.toLocaleString()} transactions using ${modelToUse}!`, 'success');
      // Refresh history
      const hist = await getAnalysisHistory();
      setHistory(hist);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setAnalysisError(msg);
      showToast("Prediction error: " + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrainModels = async (trainOptions) => {
    setLoading(true);
    try {
      showToast("Training Logistic Regression, Random Forest, and Isolation Forest...", 'info');
      await trainModels(trainOptions);
      const ev = await getModelEvaluations();
      setEvaluations(ev);
      const h = await getHealth();
      setHealth(h);
      showToast("All models retrained and evaluated on test split successfully!", 'success');
      // Re-run batch analysis with newly trained weights
      handleRunAnalysis();
    } catch (err) {
      showToast("Training failed: " + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return { title: 'Financial Intelligence Dashboard', subtitle: 'Real-time overview of fraud classifications, outlier metrics, and system status.' };
      case 'data': return { title: 'Dataset & Schema Ingestion', subtitle: 'Upload transaction CSV files, inspect PCA distributions, and validate column integrity.' };
      case 'fraud': return { title: 'Supervised Fraud Classification', subtitle: 'Predict fraud using Random Forest and Logistic Regression with calibrated risk probabilities.' };
      case 'anomaly': return { title: 'Unsupervised Anomaly Detection', subtitle: 'Discover zero-day outliers and statistical novelties using Isolation Forest without labels.' };
      case 'lab': return { title: 'Model Laboratory & Evaluation', subtitle: 'Compare test set precision, recall, PR-AUC, and inspect side-by-side confusion matrices.' };
      case 'explorer': return { title: 'Transaction Explorer', subtitle: 'Search, filter by risk tiers, inspect individual transaction scores, and export results.' };
      case 'reports': return { title: 'Audit Reports & History', subtitle: 'Download formal academic audit summaries in PDF and CSV format, and manage SQLite logs.' };
      default: return { title: 'Fraud & Anomaly Detection', subtitle: 'BCA Final Academic Project' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-wrapper">
        <Topbar 
          title={title} 
          subtitle={subtitle} 
          health={health} 
          activeDataset={activeDataset} 
          onOpenUpload={() => setActiveTab('data')}
        />

        {toastMessage && (
          <div className={`toast-banner ${toastMessage.type === 'error' ? 'toast-error' : toastMessage.type === 'success' ? 'toast-success' : 'toast-info'}`}>
            {toastMessage.type === 'success' && <CheckCircle size={18} style={{ flexShrink: 0 }} />}
            {toastMessage.type === 'error' && <XCircle size={18} style={{ flexShrink: 0 }} />}
            {toastMessage.type === 'info' && <Info size={18} style={{ flexShrink: 0 }} />}
            <span>{toastMessage.msg}</span>
          </div>
        )}

        <main className="content-body">
          {activeTab === 'dashboard' && (
            <DashboardView 
              analysisData={analysisData}
              history={history}
              onRunAnalysis={() => handleRunAnalysis()}
              loading={loading}
              onNavigate={setActiveTab}
              activeDataset={activeDataset}
            />
          )}

          {activeTab === 'data' && (
            <DataManagementView 
              datasets={datasets}
              selectedDataset={activeDataset}
              onSelectDataset={handleSelectDataset}
              datasetInspection={datasetInspection}
              onUploadFile={handleUploadFile}
              onGenerateSample={handleGenerateSample}
              loading={loading}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'fraud' && (
            <FraudDetectionView 
              analysisData={analysisData}
              onRunAnalysis={handleRunAnalysis}
              loading={loading}
              selectedModel={selectedSupervisedModel}
              setSelectedModel={setSelectedSupervisedModel}
              activeDataset={activeDataset}
              evaluations={evaluations}
              datasetInspection={datasetInspection}
              error={analysisError}
            />
          )}

          {activeTab === 'anomaly' && (
            <AnomalyDetectionView 
              analysisData={analysisData}
              evaluations={evaluations}
            />
          )}

          {activeTab === 'lab' && (
            <ModelLabView 
              evaluations={evaluations}
              onRetrainModels={handleRetrainModels}
              loading={loading}
              activeDataset={activeDataset}
            />
          )}

          {activeTab === 'explorer' && (
            <TransactionExplorerView 
              analysisData={analysisData}
              activeDataset={activeDataset}
              onToast={showToast}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView 
              analysisData={analysisData}
              history={history}
              onRefreshHistory={async () => {
                const hist = await getAnalysisHistory();
                setHistory(hist);
              }}
              evaluations={evaluations}
              activeDataset={activeDataset}
            />
          )}
        </main>
      </div>
    </div>
  );
}
