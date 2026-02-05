import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const queryClient = new QueryClient();
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('CSMS: 앱을 오프라인에서도 사용할 수 있습니다.');
  },
  onUpdate: () => {
    console.log('CSMS: 새 버전이 있습니다. 탭을 새로고침해 주세요.');
  },
});
reportWebVitals();
