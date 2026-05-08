import { useState } from 'react';

/**
 * sessionStorage에 필터 값을 저장하는 커스텀 훅.
 * 메뉴 이동 후 돌아와도 마지막 필터 값이 유지된다.
 * 브라우저 탭을 닫으면 자연스럽게 초기화된다.
 *
 * @param {string} key - sessionStorage 저장 키 (페이지별 고유값 사용)
 * @param {*} defaultValue - 초기값 (string | number 모두 지원)
 */
export function usePersistedFilter(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  });

  const setPersistedValue = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(value) : newValue;
    setValue(resolved);
    try {
      sessionStorage.setItem(key, JSON.stringify(resolved));
    } catch {
      // sessionStorage 쓰기 실패 시 메모리 상태만 유지
    }
  };

  return [value, setPersistedValue];
}
