import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = "No Data Available", 
  description = "There are no records to display at this time.", 
  actionLabel, 
  onAction,
  actionIcon: ActionIcon
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={24} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {ActionIcon && <ActionIcon size={16} />}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
