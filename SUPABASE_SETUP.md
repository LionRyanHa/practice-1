# Supabase 설정

## 1. 데이터베이스 만들기

1. Supabase Dashboard에서 프로젝트를 엽니다.
2. SQL Editor에서 New query를 누릅니다.
3. `supabase-setup.sql` 전체를 붙여 넣고 Run을 누릅니다.
4. 새 쿼리에서 `supabase-lesson-seed.sql` 전체를 붙여 넣고 Run을 누릅니다.
5. Table Editor에 `profiles` 테이블이 생겼는지 확인합니다.

기능이나 보안 SQL이 변경될 때마다 두 파일을 위 순서대로 다시 실행합니다.
SQL은 여러 번 실행해도 기존 학습 기록을 유지하도록 작성되어 있습니다.

브라우저의 `anon`/`authenticated` 역할에는 테이블 쓰기 권한이 없습니다.
이름·테마 변경, 출석, 단원 구매, 레벨업, 퀴즈 보상은 서버 RPC가 조건을
검증한 뒤에만 반영합니다. 퀴즈 시도와 포인트 원장은 API에 노출되지 않는
`private` 스키마에 저장됩니다.

## 2. 로그인 주소 등록

Authentication > URL Configuration에서 다음 주소를 등록합니다.

- Site URL: 실제 배포 주소
- Redirect URLs: 실제 배포 주소와 개발 주소
- 개발 주소 예시: `http://localhost:8000/**`

운영 환경에서는 불필요한 Redirect URL과 와일드카드를 제거합니다.

## 3. 이메일 로그인

Authentication > Providers > Email을 활성화합니다.

실제 서비스에서는 다음 설정을 권장합니다.

- Confirm email 활성화
- 최소 비밀번호 길이 10자 이상
- Leaked password protection 활성화
- CAPTCHA 활성화
- 로그인·회원가입 rate limit 제한

## 4. 관리자 계정 지정

초대코드를 볼 수 있는 계정은 `profiles.is_admin` 값이 `true`인 계정뿐입니다.
처음 한 번만 SQL Editor에서 아래 이메일을 본인 이메일로 바꿔 실행합니다.

```sql
update public.profiles
set is_admin = false;

update public.profiles p
set
    is_admin = true,
    invite_approved = true
from auth.users u
where p.user_id = u.id
  and lower(u.email) = lower($$lionryan4796@gmail.com$$);
```

관리자로 지정된 계정으로 앱에 로그인하면 설정 화면에서 현재 초대코드를
볼 수 있습니다. 사용된 초대코드는 즉시 폐기되고 새 코드가 생성됩니다.

## 5. 키와 배포 보안

`supabase-config.js`에는 Publishable Key만 둡니다. 이 키는 브라우저에 공개되는
키이며 실제 권한은 SQL의 GRANT, RLS, RPC 검증이 결정합니다.

다음 값은 절대로 HTML, JavaScript, Git 저장소에 넣지 않습니다.

- `service_role` 키
- Supabase 데이터베이스 비밀번호
- 개인 액세스 토큰

현재 HTML에는 CSP가 적용되어 있고 Supabase JS는 고정 버전과 SRI로 검증되는
로컬 `vendor` 파일을 사용합니다. 별도 호스팅을 사용한다면 응답 헤더에도
`Content-Security-Policy`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS를 설정합니다.

## 6. 적용 확인

일반 사용자로 로그인한 브라우저 콘솔에서 `profiles` 테이블에 직접 `update`,
`insert`, `delete`를 요청하면 `permission denied`가 반환되어야 합니다. 로컬
JavaScript 객체나 화면 숫자를 바꾸더라도 새로고침하면 서버 값으로 복구되어야
합니다. 실제 포인트 변경은 승인된 RPC와 `private.point_ledger` 기록을 통해서만
일어납니다.
