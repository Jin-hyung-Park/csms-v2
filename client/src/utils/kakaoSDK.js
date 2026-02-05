// 카카오 SDK 초기화
export const initKakaoSDK = () => {
  if (window.Kakao) {
    const kakao = window.Kakao;
    
    // 이미 초기화되어 있는지 확인
    if (kakao.isInitialized()) {
      return;
    }
    
    // 카카오 SDK 초기화
    const KAKAO_APP_KEY = process.env.REACT_APP_KAKAO_APP_KEY;
    
    if (!KAKAO_APP_KEY) {
      console.error('카카오 앱 키가 설정되지 않았습니다. REACT_APP_KAKAO_APP_KEY 환경변수를 확인해주세요.');
      return;
    }
    
    kakao.init(KAKAO_APP_KEY);
    console.log('카카오 SDK 초기화 완료');
  } else {
    console.error('카카오 SDK가 로드되지 않았습니다.');
  }
};

// 카카오 로그인 상태 확인
export const checkKakaoLoginStatus = () => {
  if (window.Kakao) {
    return window.Kakao.Auth.getAccessToken() !== null;
  }
  return false;
};

// 카카오 로그아웃
export const kakaoLogout = () => {
  if (window.Kakao) {
    window.Kakao.Auth.logout();
  }
}; 