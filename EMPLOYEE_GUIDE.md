# 📋 대치메가점 근무자 가이드

**CSMS (편의점 관리 시스템)** 가입 및 근무시간 입력 방법을 안내합니다.

---

## 목차

1. [회원가입](#1-회원가입)
2. [가입 승인 대기](#2-가입-승인-대기)
3. [승인 완료 확인](#3-승인-완료-확인)
4. [근무시간 입력](#4-근무시간-입력)
5. [입력 내역 확인](#5-입력-내역-확인)

---

## 1. 회원가입

앱 접속 후 로그인 화면 하단의 **"회원가입"** 링크를 누릅니다.

<img src="https://raw.githubusercontent.com/Jin-hyung-Park/csms-v2/feature/user-model-extension/screenshot/%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_1.png" width="320" alt="로그인 화면">

회원가입 화면에서 아래 항목을 입력합니다.

<img src="https://raw.githubusercontent.com/Jin-hyung-Park/csms-v2/feature/user-model-extension/screenshot/%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_2.png" width="320" alt="회원가입 양식">

| 항목 | 입력 내용 |
|------|-----------|
| 이름 | 본인 실명 |
| 이메일 | 로그인에 사용할 이메일 주소 |
| 비밀번호 | 6자리 이상 |
| 비밀번호 확인 | 위와 동일하게 재입력 |
| 전화번호 | (선택) 본인 연락처 |
| 역할 | **근로자** 선택 |
| 매장코드 | **`CU001`** 입력 후 **검증** 버튼 클릭 |

> ⚠️ **매장코드는 반드시 `CU001`을 입력하고 검증 버튼을 눌러야 합니다.**  
> 검증 후 "매장: CU 대치메가점" 문구가 나타나면 정상입니다.

<img src="https://raw.githubusercontent.com/Jin-hyung-Park/csms-v2/feature/user-model-extension/screenshot/%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_3.png" width="320" alt="회원가입 입력 완료 예시">

매장코드 검증 확인 후 **"회원가입"** 버튼을 누릅니다.

---

## 2. 가입 승인 대기

가입 완료 후 로그인하면 상단에 아래와 같은 안내 배너가 표시됩니다.

> **"가입 승인 대기 중입니다. 점주 승인 후 서비스를 이용할 수 있습니다."**

<img src="https://raw.githubusercontent.com/Jin-hyung-Park/csms-v2/feature/user-model-extension/screenshot/%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_4_%EA%B0%80%EC%9E%85%EC%8A%B9%EC%9D%B8%EB%8C%80%EA%B8%B0.png" width="320" alt="가입 승인 대기 화면">

이 상태에서는 점주가 승인하기 전까지 대기해야 합니다.  
**점주에게 가입 사실을 알려주세요.**

---

## 3. 승인 완료 확인

점주가 승인하면 대시보드에 근무 정보가 표시됩니다.

<img src="https://raw.githubusercontent.com/Jin-hyung-Park/csms-v2/feature/user-model-extension/screenshot/%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_5_%EC%8A%B9%EC%9D%B8%EC%99%84%EB%A3%8C.png" width="320" alt="승인 완료 후 대시보드">

승인 완료 시 확인할 수 있는 정보:
- 근무 점포: **CU 대치메가점**
- 근무 요일 / 근무 시간
- 주간 계약 시간 / 시급

이제 근무시간 입력이 가능합니다.

---

## 4. 근무시간 입력

하단 탭에서 **"근무표"** 를 누릅니다.

<img src="https://raw.githubusercontent.com/Jin-hyung-Park/csms-v2/feature/user-model-extension/screenshot/%EA%B7%BC%EB%AC%B4%EC%8B%9C%EA%B0%84%EC%9E%85%EB%A0%A5.png" width="320" alt="근무시간 입력 화면">

**근무 일정 등록** 섹션에서 아래 항목을 입력합니다.

| 항목 | 입력 내용 |
|------|-----------|
| 근무 점포 | CU 대치메가점 (자동 선택) |
| 근무 날짜 | 근무한 날짜 선택 |
| 시작 시간 | 실제 근무 시작 시각 |
| 종료 시간 | 실제 근무 종료 시각 |
| 메모 | (선택) 업무 내용 간단히 기재 |

입력 완료 후 **"근무 일정 저장"** 버튼을 누릅니다.  
하단에 **"근무 일정이 저장되었어요."** 문구가 뜨면 정상 저장된 것입니다.

---

## 5. 입력 내역 확인

저장 후 **근무 내역 조회** 섹션에서 월/주차를 선택하면 입력한 내역을 확인할 수 있습니다.

<img src="https://raw.githubusercontent.com/Jin-hyung-Park/csms-v2/feature/user-model-extension/screenshot/%EA%B7%BC%EB%AC%B4%EC%8B%9C%EA%B0%84%EC%9E%85%EB%A0%A5_%ED%99%95%EC%9D%B8.png" width="320" alt="근무시간 입력 내역 확인">

각 근무 내역 옆의 버튼으로 아래 작업이 가능합니다.

| 버튼 | 기능 |
|------|------|
| 대기 | 점주 승인 전 상태 |
| 수정 | 입력 내용 수정 |
| 취소 | 해당 근무 기록 삭제 |

> ⚠️ **점주가 승인한 근무는 수정/취소가 불가합니다.**  
> 수정이 필요한 경우 점주에게 직접 문의하세요.

---

## 자주 묻는 질문

**Q. 매장코드를 모릅니다.**  
A. 대치메가점 매장코드는 **`CU001`** 입니다.

**Q. 가입 후 오랫동안 승인이 안 됩니다.**  
A. 점주에게 직접 연락해 가입 승인을 요청하세요.

**Q. 어제 근무를 오늘 입력해도 되나요?**  
A. 네, 날짜를 직접 선택할 수 있으므로 날짜를 정확히 선택해 입력하면 됩니다.

**Q. 입력한 근무가 안 보입니다.**  
A. 근무 내역 조회에서 해당 월과 주차를 다시 선택해보세요.

---

*문의: 점주에게 직접 연락하세요.*
