#!/bin/bash

# CSMS 테스트 스크립트
echo "🚀 CSMS 테스트 시작"
echo "=================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 테스트 결과 카운터
PASS=0
FAIL=0

# 테스트 함수
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    echo -e "\n${YELLOW}테스트: $name${NC}"
    echo "URL: $url"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data")
    else
        response=$(curl -s -X "$method" "$url")
    fi
    
    if [ $? -eq 0 ] && echo "$response" | grep -q "status\|message\|token"; then
        echo -e "${GREEN}✅ 성공${NC}"
        echo "응답: $response"
        ((PASS++))
    else
        echo -e "${RED}❌ 실패${NC}"
        echo "응답: $response"
        ((FAIL++))
    fi
}

# 1. 서버 상태 확인
test_endpoint "서버 상태 확인" "http://localhost:5001/api/health"

# 2. 회원가입 테스트
register_data='{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "employee",
    "name": "테스트 사용자",
    "phone": "010-1234-5678"
}'
test_endpoint "회원가입" "http://localhost:5001/api/auth/register" "POST" "$register_data"

# 3. 로그인 테스트
login_data='{
    "email": "test@example.com",
    "password": "password123"
}'
test_endpoint "로그인" "http://localhost:5001/api/auth/login" "POST" "$login_data"

# 4. MongoDB 연결 확인
echo -e "\n${YELLOW}MongoDB 연결 확인${NC}"
mongo_result=$(mongosh convenience_store --eval "db.runCommand('ping')" --quiet 2>/dev/null)
if echo "$mongo_result" | grep -q "ok.*1"; then
    echo -e "${GREEN}✅ MongoDB 연결 성공${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ MongoDB 연결 실패${NC}"
    ((FAIL++))
fi

# 결과 출력
echo -e "\n${YELLOW}=================================="
echo "테스트 결과 요약"
echo "=================================="
echo -e "${GREEN}성공: $PASS${NC}"
echo -e "${RED}실패: $FAIL${NC}"
echo -e "총 테스트: $((PASS + FAIL))${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "\n${GREEN}🎉 모든 테스트가 성공했습니다!${NC}"
else
    echo -e "\n${RED}⚠️  일부 테스트가 실패했습니다.${NC}"
fi

echo -e "\n${YELLOW}추가 테스트 방법:${NC}"
echo "1. 브라우저에서 http://localhost:5001/api/health 접속"
echo "2. Postman에서 API 테스트"
echo "3. test_api_guide.md 파일 참조" 