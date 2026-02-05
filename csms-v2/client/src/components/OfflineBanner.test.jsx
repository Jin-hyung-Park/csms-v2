import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';

describe('OfflineBanner', () => {
  const offlineMessage = /오프라인입니다.*일부 기능이 제한됩니다/i;

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('온라인일 때는 아무것도 렌더하지 않는다', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(offlineMessage)).not.toBeInTheDocument();
  });

  it('오프라인 이벤트 후 배너를 표시한다', async () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: false, writable: true, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(offlineMessage)).toBeInTheDocument();
    });
  });

  it('다시 온라인 이벤트 후 배너를 숨긴다', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, writable: true, configurable: true });
    render(<OfflineBanner />);
    await act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
