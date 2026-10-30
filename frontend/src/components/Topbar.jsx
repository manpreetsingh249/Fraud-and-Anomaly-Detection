import React from 'react';
import { Cpu, HardDrive, UploadCloud } from 'lucide-react';

export default function Topbar({ title, subtitle, health, activeDataset, onOpenUpload }) {
  const isHealthy = health?.status === 'healthy';
  const readyModelsCount = health?.models_status 
    ? Object.values(health.models_status).filter(Boolean).length 
    : 0;

  return (
    <header className="topbar">
      <div className="page-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        {/* Prominent Primary Action Button */}
        <button 
          className="btn btn-primary" 
          onClick={onOpenUpload}
          title="Upload a new CSV dataset for evaluation or prediction"
        >
          <UploadCloud size={16} />
          <span>Upload Dataset</span>
        </button>

        {/* Active Dataset Pill */}
        {activeDataset && (
          <div className="status-pill" title={`Active dataset: ${activeDataset}`}>
            <HardDrive size={14} color="#0D9488" />
            <span>Dataset: <strong>{activeDataset}</strong></span>
          </div>
        )}

        {/* AI Models Readiness */}
        <div className="status-pill" title="Loaded Machine Learning Models">
          <Cpu size={14} color="#7C3AED" />
          <span>Models: <strong>{readyModelsCount}/4 Ready</strong></span>
        </div>

        {/* Backend API Connection Pill */}
        <div className="status-pill" title={isHealthy ? 'Backend FastAPI service connected' : 'Backend disconnected'}>
          <div className={`status-indicator ${isHealthy ? '' : 'offline'}`} />
          <span>{isHealthy ? 'FastAPI Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </header>
  );
}
