// Sentry must be initialized before anything else renders.
import './instrument';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import App from './App';
import { installGlobalErrorToasts, notifyError } from './notify';
import './styles.css';

installGlobalErrorToasts();

// retry: false so a failing demo request produces one Sentry error, not one per retry.
// The cache-level onError toasts every failed query/mutation from the generated hooks.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  queryCache: new QueryCache({ onError: (err) => notifyError(err, { source: 'query' }) }),
  mutationCache: new MutationCache({ onError: (err) => notifyError(err, { source: 'mutation' }) }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Outside the ErrorBoundary so toasts survive an app-wide crash. Bottom-left keeps clear of the
        React Query devtools and Sentry feedback buttons (both bottom-right). */}
    <Toaster position="bottom-left" theme="dark" richColors closeButton />
    {/* App-wide safety net. Cards on the Error Lab page use their own, smaller boundaries. */}
    <Sentry.ErrorBoundary
      showDialog
      onError={(error, _componentStack, eventId) => notifyError(error, { eventId, source: 'app crashed' })}
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
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
