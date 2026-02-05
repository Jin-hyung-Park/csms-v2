#!/bin/bash

# 프론트엔드 배포 스크립트
# 사용법: SSH 접속 후 이 스크립트를 실행하세요

set -e

echo "================================"
echo "프론트엔드 배포 시작"
echo "================================"

# 변수 설정
APP_DIR="/home/ubuntu/convenience_store_management"
BUILD_DIR="$APP_DIR/client/build"
BACKUP_DIR="$APP_DIR/client/build_backup_$(date +%Y%m%d_%H%M%S)"

# 현재 디렉토리로 이동
cd "$APP_DIR"

# 1. 기존 빌드 파일 백업
echo "1. 기존 빌드 파일 백업 중..."
if [ -d "$BUILD_DIR" ]; then
    sudo mv "$BUILD_DIR" "$BACKUP_DIR"
    echo "   백업 완료: $BACKUP_DIR"
else
    echo "   기존 빌드 파일 없음"
fi

# 2. 새로운 빌드 파일 압축 해제
echo "2. 새로운 빌드 파일 압축 해제 중..."
if [ -f "$APP_DIR/client-build-updated.tar.gz" ]; then
    cd "$APP_DIR/client"
    sudo tar -xzf "$APP_DIR/client-build-updated.tar.gz"
    echo "   압축 해제 완료"
else
    echo "   오류: client-build-updated.tar.gz 파일이 없습니다"
    exit 1
fi

# 3. 권한 설정
echo "3. 파일 권한 설정 중..."
sudo chown -R ubuntu:ubuntu "$BUILD_DIR"
sudo chmod -R 755 "$BUILD_DIR"
echo "   권한 설정 완료"

# 4. Nginx 설정 확인
echo "4. Nginx 설정 확인 중..."
sudo nginx -t

# 5. Nginx 재시작
echo "5. Nginx 재시작 중..."
sudo systemctl restart nginx
echo "   Nginx 재시작 완료"

# 6. 서비스 상태 확인
echo "6. 서비스 상태 확인 중..."
sudo systemctl status nginx --no-pager | head -10

echo ""
echo "================================"
echo "프론트엔드 배포 완료!"
echo "================================"
echo ""
echo "배포된 파일 확인:"
ls -lh "$BUILD_DIR/static/js/" | grep main

echo ""
echo "웹사이트 확인: http://54.180.88.34"
echo ""

