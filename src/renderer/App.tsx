import React from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NotificationDisplay } from './components/notification/NotificationDisplay';
import { useProjectStore } from './stores/projectStore';
import './App.css';

const App: React.FC = () => {
  const isLoading = useProjectStore((state) => state.app.isLoading);
  const errors = useProjectStore((state) => state.app.errors);
  const clearErrors = useProjectStore((state) => state.clearErrors);

  return (
    <div className="app">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      )}
      
      {errors.length > 0 && (
        <div className="error-banner">
          {errors.map((error, index) => (
            <div key={index} className="error-message">
              <span>{error.message}</span>
              <button 
                className="error-close"
                onClick={clearErrors}
                title="エラーを閉じる"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <MainLayout />
      <NotificationDisplay />
    </div>
  );
};

export default App;