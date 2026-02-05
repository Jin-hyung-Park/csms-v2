# GitHub 푸시 방법

현재 로컬에는 커밋까지 완료된 상태입니다. GitHub에 반영하려면 아래 순서대로 진행하세요.

## 1. GitHub에서 저장소 생성

1. https://github.com/new 접속
2. Repository name 입력 (예: `convenience_store_management`)
3. Public/Private 선택 후 **Create repository** 클릭
4. 생성된 저장소 URL 복사 (예: `https://github.com/사용자명/convenience_store_management.git`)

## 2. 원격 저장소 연결 후 푸시

프로젝트 루트에서:

```bash
# 원격 추가 (URL은 본인 저장소 주소로 변경)
git remote add origin https://github.com/사용자명/convenience_store_management.git

# 푸시 (최초 1회)
git push -u origin master
```

이후에는 `git push` 만 하면 됩니다.

## 참고

- `deployment-info.txt`, `*.pem` 은 `.gitignore`에 있어 GitHub에 올라가지 않습니다.
- 커밋 시 `unknown option trailer` 오류가 나면 터미널에서  
  `env -i PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin" HOME="$HOME" git commit -m "메시지"`  
  형태로 최소 환경에서 커밋하면 됩니다.
