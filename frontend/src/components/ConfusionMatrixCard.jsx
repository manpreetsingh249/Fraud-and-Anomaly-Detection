import React from 'react';

export default function ConfusionMatrixCard({ matrix, title = "Confusion Matrix (Test Split)" }) {
  if (!matrix || matrix.length < 2) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 16, background: '#F9FAFB', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
        Confusion matrix not available. Train or evaluate a supervised model to view.
      </div>
    );
  }

  const [row0, row1] = matrix;
  const tn = row0[0];
  const fp = row0[1];
  const fn = row1[0];
  const tp = row1[1];

  const total = tn + fp + fn + tp;
  const accuracy = total > 0 ? (((tn + tp) / total) * 100).toFixed(2) : "0.00";
  const recall = (tp + fn) > 0 ? ((tp / (tp + fn)) * 100).toFixed(2) : "0.00";
  const precision = (tp + fp) > 0 ? ((tp / (tp + fp)) * 100).toFixed(2) : "0.00";

  return (
    <div style={{ 
      background: '#FFFFFF', 
      padding: '20px', 
      borderRadius: '12px', 
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {title}
        </h4>
        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
          Evaluated Samples: {total.toLocaleString()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {/* True Negatives */}
        <div style={{ 
          background: '#F0FDF4', 
          border: '1px solid #BBF7D0', 
          borderRadius: 8, 
          padding: '12px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 11, color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>
            True Negatives (TN)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>
            {tn.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>Correct Legitimate</div>
        </div>

        {/* False Positives */}
        <div style={{ 
          background: '#FFFBEB', 
          border: '1px solid #FDE68A', 
          borderRadius: 8, 
          padding: '12px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600, textTransform: 'uppercase' }}>
            False Positives (FP)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {fp.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>False Alarm (Type I)</div>
        </div>

        {/* False Negatives */}
        <div style={{ 
          background: '#FEF2F2', 
          border: '1px solid #FECACA', 
          borderRadius: 8, 
          padding: '12px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600, textTransform: 'uppercase' }}>
            False Negatives (FN)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
            {fn.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>Missed Fraud (Type II)</div>
        </div>

        {/* True Positives */}
        <div style={{ 
          background: '#F5F3FF', 
          border: '1px solid #DDD6FE', 
          borderRadius: 8, 
          padding: '12px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, textTransform: 'uppercase' }}>
            True Positives (TP)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>
            {tp.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>Caught Fraud Cases</div>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        fontSize: 12, 
        color: 'var(--text-secondary)', 
        borderTop: '1px solid var(--border-subtle)', 
        paddingTop: 12 
      }}>
        <span>Recall: <strong style={{ color: 'var(--text-main)' }}>{recall}%</strong></span>
        <span>Precision: <strong style={{ color: 'var(--text-main)' }}>{precision}%</strong></span>
        <span>Accuracy: <strong style={{ color: 'var(--text-main)' }}>{accuracy}%</strong></span>
      </div>
    </div>
  );
}
