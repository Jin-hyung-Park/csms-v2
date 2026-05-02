# 베타 테스트 전 데이터 초기화 가이드

실 사용자 베타 테스트 전에, 현재까지 입력된 **테스트용 데이터를 모두 삭제**하고 **실사용 준비 상태**로 만드는 방법입니다.

## 스크립트 동작

`server/scripts/reset-for-beta.js` 실행 시:

1. **삭제** (전부)
   - 알림(Notification)
   - 근무일정(WorkSchedule)
   - 월급(MonthlySalary)
   - 사용자(User)
   - 점포(Store)

2. **생성** (최소만)
   - 점주 1명 (로그인용, 비밀번호 변경 권장)
   - 매장코드 **CU002** 점포 1개 (CU 삼성메가점)

직원·근무일정·알림은 생성하지 않습니다. 실 사용자가 앱에서 회원가입 → 매장코드 CU002 검증 → 점주 승인 후 이용하면 됩니다.

## 실행 방법

### 1. 로컬에서 실행 (DB만 원격인 경우)

```bash
cd csms-v2/server
# .env에 MONGODB_URI가 AWS/원격 MongoDB로 설정되어 있어야 함
node scripts/reset-for-beta.js --confirm
```

### 2. AWS에서 실행

백엔드가 **EC2 / ECS / Lambda 등**에서 구동 중이라면, 같은 환경에서 한 번만 실행하면 됩니다.

- **EC2**
  - 서버에 SSH 접속 후:
    ```bash
    cd /path/to/csms-v2/server
    export MONGODB_URI="mongodb+srv://..."   # 실제 연결 문자열
    node scripts/reset-for-beta.js --confirm
    ```
- **ECS (Fargate 등)**
  - 일회성 태스크로 실행: 동일 이미지로 `node scripts/reset-for-beta.js --confirm` 를 커맨드로 지정하고, `MONGODB_URI` 등 환경 변수는 기존 서비스와 동일하게 설정.
- **Elastic Beanstalk**
  - EB SSH 또는 로컬에서 `eb ssh` 후, 앱 디렉터리에서 위와 같이 `MONGODB_URI` 설정 후 스크립트 실행.

### 3. 옵션

- `--confirm` 또는 `-y`  
  없으면 실제 삭제/생성 없이 안내만 출력합니다.
- 점주 계정 커스터마이즈 (선택):
  - `BETA_OWNER_EMAIL`: 점주 이메일 (기본값: `owner@cu002.local`)
  - `BETA_OWNER_PASSWORD`: 점주 비밀번호 (기본값: `change-me-after-first-login`)

예:

```bash
BETA_OWNER_EMAIL=owner@example.com BETA_OWNER_PASSWORD=secure-password node scripts/reset-for-beta.js --confirm
```

## 실행 후 확인

- 앱 접속: [베타테스트 가이드](BETA_TEST_CARD_NEWS.md)의 접속 주소 사용
- 점주: 위에서 설정한 이메일/비밀번호로 로그인 → **첫 로그인 후 비밀번호 변경 권장**
- 직원: 회원가입 시 매장코드 **CU002** 입력 → 검증 후 가입 → 점주가 승인하면 이용 가능

## 주의사항

- `--confirm` 사용 시 **현재 DB의 위 컬렉션 데이터는 전부 삭제**됩니다. 운영 DB에서 실행할 때는 백업 후 진행하세요.
- AWS MongoDB(Atlas 등) 사용 시, `MONGODB_URI`에 IP 화이트리스트/권한이 허용된 환경에서만 실행하세요.
