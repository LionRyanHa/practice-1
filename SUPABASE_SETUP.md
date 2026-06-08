# Supabase 설정

## 1. 데이터베이스 만들기

1. Supabase Dashboard에서 프로젝트를 엽니다.
2. SQL Editor에서 New query를 누릅니다.
3. 프로젝트의 supabase-setup.sql 내용을 붙여 넣고 Run을 누릅니다.
4. Table Editor에 profiles 테이블이 생겼는지 확인합니다.

이 SQL은 사용자별 학습 기록, RLS 보안 정책, 신규 사용자 프로필 생성,
리더보드 함수, 초대코드 승인 함수를 만듭니다.

## 2. 로그인 주소 등록

Authentication > URL Configuration에서 다음 주소를 등록합니다.

- Site URL: 실제 배포 주소
- Redirect URLs: 실제 배포 주소와 개발 주소
- 개발 주소 예시: http://localhost:8000/**

## 3. 이메일 로그인

Authentication > Providers > Email을 활성화합니다.

개발 중 이메일 확인 절차가 필요 없으면 Confirm email을 끌 수 있습니다.
실제 서비스에서는 이메일 확인을 켜는 편이 안전합니다.

## 4. 관리자 계정 지정

초대코드를 볼 수 있는 계정은 profiles.is_admin 값이 true인 계정뿐입니다.
처음 한 번만 SQL Editor에서 아래 이메일을 본인 이메일로 바꿔 실행합니다.

update public.profiles
set is_admin = false;

update public.profiles p
set
    is_admin = true,
    invite_approved = true
from auth.users u
where p.user_id = u.id
  and lower(u.email) = lower($$lionryan4796@gmail.com$$);


관리자로 지정된 계정으로 앱에 로그인한 뒤 설정 화면에서 현재 초대코드를 볼 수 있습니다.
누군가 초대코드를 맞게 입력하면 그 코드는 바로 폐기되고 새 코드가 생성됩니다.
새 코드는 관리자 계정의 설정 화면에서 새로고침을 누르면 확인할 수 있습니다.
