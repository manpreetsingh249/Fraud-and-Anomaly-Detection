import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  ShieldAlert, 
  SearchCode, 
  FlaskConical, 
  FileSpreadsheet, 
  FileText,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'fraud', label: 'Supervised Fraud ML', icon: ShieldAlert },
  { id: 'anomaly', label: 'Unsupervised Anomaly', icon: SearchCode },
  { id: 'lab', label: 'Model Laboratory', icon: FlaskConical },
  { id: 'explorer', label: 'Transaction Explorer', icon: FileSpreadsheet },
  { id: 'reports', label: 'Audit Reports & Logs', icon: FileText },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <ShieldCheck size={22} />
        </div>
        <div className="brand-text">
          <h1>FinAnomaly AI</h1>
          <span>Enterprise & Academic Edition</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-link ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div><strong>BCA Final Project</strong></div>
        <div>Fraud & Anomaly Detection</div>
        <div className="bca-badge">
          <GraduationCap size={13} />
          <span>Viva Ready Demonstration</span>
        </div>
      </div>
    </aside>
  );
}
