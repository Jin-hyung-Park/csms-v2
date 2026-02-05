#!/bin/bash

# Homebrew 권한 문제 해결 스크립트

echo "🔧 Homebrew 권한 문제 해결 중..."
echo ""

# Docker CLI 플러그인 디렉토리 권한 수정
echo "1. Docker 디렉토리 권한 수정..."
if [ -d "/usr/local/lib/docker" ]; then
    sudo chown -R $(whoami):admin /usr/local/lib/docker
    echo "✅ /usr/local/lib/docker 권한 수정 완료"
else
    echo "⚠️  /usr/local/lib/docker 디렉토리가 없습니다."
fi

echo ""
echo "2. Homebrew 디렉토리 권한 확인 및 수정..."
# Homebrew 디렉토리 권한 수정 (필요한 경우)
sudo chown -R $(whoami):admin /usr/local/lib 2>/dev/null || true

echo ""
echo "3. Homebrew 진단 실행..."
brew doctor 2>&1 | grep -A 5 "Warning" || echo "✅ 문제가 없습니다!"

echo ""
echo "✅ 권한 문제 해결 완료!"
echo ""
echo "이제 다음 명령어를 실행할 수 있습니다:"
echo "  brew upgrade awscli"

