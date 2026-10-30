import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const getHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const listDatasets = async () => {
  const res = await api.get('/datasets');
  return res.data;
};

export const uploadDataset = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (event) => {
      if (event.total) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    } : undefined
  });
  return res.data;
};

export const generateSampleDataset = async (numSamples = 1500, fraudRate = 0.02) => {
  const res = await api.post('/datasets/sample', {
    num_samples: numSamples,
    fraud_rate: fraudRate
  });
  return res.data;
};

export const previewDataset = async (filename) => {
  const res = await api.get(`/datasets/${encodeURIComponent(filename)}/preview`);
  return res.data;
};

export const getModelStatus = async () => {
  const res = await api.get('/models/status');
  return res.data;
};

export const trainModels = async ({ filename, testSize = 0.20, randomState = 42, models = ["logistic_regression", "random_forest", "isolation_forest"] }) => {
  const res = await api.post('/models/train', {
    filename,
    test_size: testSize,
    random_state: randomState,
    models_to_train: models
  });
  return res.data;
};

export const getModelEvaluations = async () => {
  const res = await api.get('/models/evaluations');
  return res.data;
};

export const predictBatch = async ({ filename, supervisedModel = 'random_forest', runAnomalyDetection = true, saveRun = true }) => {
  const res = await api.post('/predict/batch', {
    filename,
    supervised_model: supervisedModel,
    run_anomaly_detection: runAnomalyDetection,
    save_run: saveRun
  });
  return res.data;
};

export const predictSingle = async (transaction) => {
  const res = await api.post('/predict/single', transaction);
  return res.data;
};

export const getAnalysisHistory = async () => {
  const res = await api.get('/history');
  return res.data;
};

export const deleteAnalysisRun = async (id) => {
  const res = await api.delete(`/history/${id}`);
  return res.data;
};

export const clearAnalysisHistory = async () => {
  const res = await api.post('/history/clear');
  return res.data;
};

export const exportResultsCsv = async (results, filenamePrefix = 'fraud_analysis') => {
  const res = await api.post('/reports/export-csv', {
    results,
    filename_prefix: filenamePrefix
  }, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const exportSummaryPdf = async (runData, outputFilename = 'audit_report.pdf') => {
  const res = await api.post('/reports/export-pdf', {
    run_data: runData,
    output_filename: outputFilename
  }, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', outputFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default api;
