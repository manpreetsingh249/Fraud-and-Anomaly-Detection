import React from 'react';
import { Info, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ConceptAlert({ type = "concept" }) {
  if (type === "anomaly_vs_fraud") {
    return (
      <div className="concept-alert" style={{ borderLeftColor: 'var(--warning)' }}>
        <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="concept-alert-title" style={{ color: '#92400E' }}>
            Core Principle: An Anomaly Is NOT Automatically Fraud
          </div>
          <div className="concept-alert-text">
            Supervised fraud models look for specific behavioral fingerprints learned from known historical fraud cases. In contrast, <strong>Isolation Forest</strong> detects multivariate statistical outliers regardless of malicious intent (e.g. an unusual luxury purchase or international travel payment). Always treat anomaly alerts as flags for audit review, not definitive proof of criminality.
          </div>
        </div>
      </div>
    );
  }

  if (type === "accuracy_fallacy") {
    return (
      <div className="concept-alert" style={{ borderLeftColor: 'var(--ai-accent)' }}>
        <Info size={20} color="#7C3AED" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="concept-alert-title" style={{ color: '#5B21B6' }}>
            Academic Insight: The Accuracy Paradox in Highly Imbalanced Data
          </div>
          <div className="concept-alert-text">
            In credit card transactions, only ~0.17% of transactions are fraudulent. A useless dummy algorithm that predicts "0" for every transaction achieves <strong>99.83% accuracy</strong> yet detects 0 frauds. Therefore, this project evaluates models based on <strong>Recall</strong> (capturing actual fraud), <strong>Precision</strong> (minimizing false alarms), and <strong>PR-AUC</strong>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="concept-alert" style={{ borderLeftColor: 'var(--primary)' }}>
      <ShieldCheck size={20} color="#0D9488" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div className="concept-alert-title" style={{ color: '#0F766E' }}>
          Dual-Paradigm Architecture: Supervised Classification & Unsupervised Outlier Mining
        </div>
        <div className="concept-alert-text">
          This system deploys <strong>Logistic Regression</strong> and <strong>Random Forest</strong> for supervised classification (requiring labeled data), and <strong>Isolation Forest</strong> for unsupervised anomaly detection. Preprocessing scaling is fitted strictly on training data to prevent data leakage.
        </div>
      </div>
    </div>
  );
}
