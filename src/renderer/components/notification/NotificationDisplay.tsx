import React, { useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { AppNotification } from '../../../types/entities';
import './NotificationDisplay.css';

interface NotificationItemProps {
  notification: AppNotification;
  onClose: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.autoClose && notification.duration) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.autoClose, notification.duration, notification.id, onClose]);

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'info':
        return 'ⓘ';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return '•';
    }
  };

  return (
    <div className={`notification-item notification-${notification.type}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {getIcon(notification.type)}
        </div>
        <div className="notification-text">
          <p className="notification-title">{notification.title}</p>
          {notification.message && (
            <p className="notification-message">{notification.message}</p>
          )}
        </div>
        <button
          className="notification-close"
          onClick={() => onClose(notification.id)}
          title="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const NotificationDisplay: React.FC = () => {
  const notifications = useProjectStore(state => state.app.notifications);
  const removeNotification = useProjectStore(state => state.removeNotification);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};
