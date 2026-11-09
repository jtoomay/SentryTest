// Sentry must be initialized before anything else renders.
import './instrument';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* App-wide safety net. Cards on the Error Lab page use their own, smaller boundaries. */}
    <Sentry.ErrorBoundary
      showDialog
      fallback={({ eventId, resetError }) => (
        <div className="page">
          <h1>The app crashed</h1>
          <p>
            Sentry recorded it as event <code>{eventId}</code>.
          </p>
          <button className="btn btn-info" onClick={resetError}>
            Try again
          </button>
        </div>
      )}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
