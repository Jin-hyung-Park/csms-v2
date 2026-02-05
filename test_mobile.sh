#!/bin/bash

# 모바일 테스트 스크립트
echo "🚀 모바일 환경 테스트 시작"

# 현재 IP 주소 확인
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "📍 현재 IP 주소: $IP_ADDRESS"

# 포트 확인
echo "🔍 포트 상태 확인 중..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ 포트 3000 (클라이언트) 사용 중"
else
    echo "❌ 포트 3000 (클라이언트) 사용 가능"
fi

if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ 포트 5001 (서버) 사용 중"
else
    echo "❌ 포트 5001 (서버) 사용 가능"
fi

# 환경 변수 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다. env.example을 복사하세요."
    echo "   cp env.example .env"
fi

if [ ! -f "client/.env" ]; then
    echo "⚠️  client/.env 파일이 없습니다. env.example을 복사하세요."
    echo "   cp client/env.example client/.env"
fi

echo ""
echo "📱 모바일 테스트 준비 완료!"
echo ""
echo "다음 단계를 따라하세요:"
echo "1. 모바일 기기를 같은 Wi-Fi에 연결"
echo "2. 모바일 브라우저에서 http://$IP_ADDRESS:3000 접속"
echo "3. 근로자 계정으로 로그인 테스트"
echo "4. 근무시간 입력 기능 테스트"
echo ""
echo "서버를 시작하려면:"
echo "   npm run dev:mobile"
echo ""
echo "문제가 있으면 mobile_test_guide.md를 참조하세요." 