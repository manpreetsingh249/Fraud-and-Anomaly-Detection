import React, { useState } from 'react';
import { 
  FlaskConical, 
  RotateCcw, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import ConfusionMatrixCard from '../components/ConfusionMatrixCard';
import ConceptAlert from '../components/ConceptAlert';
import EmptyState from '../components/EmptyState';

export default function ModelLabView({ 
  evaluations, 
  onRetrainModels, 
  loading, 
  activeDataset 
}) {
  const [testSplit, setTestSplit] = useState(0.20);
  const [randomSeed, setRandomSeed] = useState(42);

  const evals = evaluations?.evaluations || [];
  const lrEval = evals.find(e => e.model_type === 'logistic_regression');
  const rfEval = evals.find(e => e.model_type === 'random_forest');
  const isoEval = evals.find(e => e.model_type === 'isolation_forest');

  const handleRetrain = () => {
    onRetrainModels({
      filename: activeDataset,
      testSize: testSplit,
      randomState: randomSeed,
      models: ["logistic_regression", "random_forest", "isolation_forest"]
    });
  };

  return (
    <div className="fade-in">
      <ConceptAlert type="accuracy_fallacy" />

      {/* Model Retraining Control Panel */}
      <div className="dashboard-card" style={{ borderColor: 'var(--ai-border)' }}>
        <div className="card-header">
          <div className="card-title">
            <FlaskConical size={18} color="#7C3AED" />
            <span>Model Laboratory & Hyperparameter Calibration</span>
          </div>
          <span className="badge badge-anomaly">Stratified Train-Test Validation</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Target Training Dataset
            </label>
            <input 
              type="text" 
              className="input-control" 
              style={{ width: '100%' }}
              value={activeDataset || 'sample_creditcard.csv'} 
              disabled 
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Test Split Ratio: <strong style={{ color: 'var(--text-main)' }}>{(testSplit * 100).toFixed(0)}% Test / {( (1 - testSplit) * 100).toFixed(0)}% Train</strong>
            </label>
            <input 
              type="range" 
              min="0.10" 
              max="0.40" 
              step="0.05" 
              value={testSplit} 
              onChange={(e) => setTestSplit(parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Reproducibility Seed (Random State)
            </label>
            <input 
              type="number" 
              className="input-control" 
              style={{ width: '100%' }}
              value={randomSeed} 
              onChange={(e) => setRandomSeed(parseInt(e.target.value))} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            🔒 RobustScaler is fitted strictly on <code>X_train</code> to prevent test set data leakage.
          </div>
          <button 
            className="btn btn-ai" 
            onClick={handleRetrain} 
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : <RotateCcw size={15} />}
            <span>Retrain & Re-evaluate All Models</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Model Evaluation Metrics Table */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <Award size={18} color="#D97706" />
            <span>Model Performance Comparison Benchmark</span>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Measured on Unseen Test Split</span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Model Name</th>
                <th>Paradigm</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>PR-AUC</th>
                <th>Supplementary Accuracy</th>
                <th>Train / Test Samples</th>
              </tr>
            </thead>
            <tbody>
              {evals.length > 0 ? (
                evals.map((item) => (
                  <tr key={item.model_type}>
                    <td>
                      <strong>{item.model_name}</strong>
                      {item.model_type === 'random_forest' && (
                        <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: 10.5 }}>
                          RECOMMENDED
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${item.is_supervised ? 'badge-low' : 'badge-anomaly'}`}>
                        {item.is_supervised ? 'Supervised' : 'Unsupervised'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: item.precision >= 0.7 ? '#16A34A' : '#D97706' }}>
                        {item.precision !== null ? (item.precision * 100).toFixed(1) + '%' : 'N/A (Unsupervised)'}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: item.recall >= 0.7 ? '#16A34A' : '#D97706' }}>
                        {item.recall !== null ? (item.recall * 100).toFixed(1) + '%' : 'N/A (Unsupervised)'}
                      </strong>
                    </td>
                    <td>
                      <strong>{item.f1_score !== null ? item.f1_score.toFixed(3) : 'N/A'}</strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: item.pr_auc ? '#7C3AED' : 'var(--text-secondary)', fontWeight: 600 }}>
                        {item.pr_auc !== null ? item.pr_auc.toFixed(3) : 'N/A'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {item.accuracy !== null ? (item.accuracy * 100).toFixed(2) + '%' : 'N/A'}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {item.train_samples} / {item.test_samples}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <EmptyState 
                      icon={FlaskConical}
                      title="No Model Evaluations Recorded"
                      description="Click 'Retrain & Re-evaluate All Models' above to train and benchmark models on the current dataset."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Confusion Matrices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
        <ConfusionMatrixCard 
          matrix={rfEval?.confusion_matrix} 
          title="Random Forest: Held-Out Test Confusion Matrix" 
        />

        <ConfusionMatrixCard 
          matrix={lrEval?.confusion_matrix} 
          title="Logistic Regression: Held-Out Test Confusion Matrix" 
        />
      </div>

      {/* Architectural Discussion & Presentation Points */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <CheckCircle2 size={18} color="#16A34A" />
            <span>Key Academic Talking Points for Viva / Final Examination</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h5 style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              Why Random Forest Outperforms
            </h5>
            <p style={{ lineHeight: 1.55 }}>
              Financial transactions contain complex non-linear combinations across PCA features (notably V14, V17, and V12). Random Forest partitions multi-dimensional decision boundaries far better than a linear hyperplane.
            </p>
          </div>

          <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h5 style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              Addressing Extreme Imbalance
            </h5>
            <p style={{ lineHeight: 1.55 }}>
              We enforce <code>class_weight='balanced'</code> to penalize false negatives inversely proportional to class frequencies, preventing the classifier from collapsing into the trivial "all normal" local minimum.
            </p>
          </div>

          <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h5 style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              Strict Train-Only Fitting
            </h5>
            <p style={{ lineHeight: 1.55 }}>
              By fitting <code>RobustScaler</code> exclusively on <code>X_train</code>, our metrics accurately demonstrate generalization capability on unseen customer transactions without data leakage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
