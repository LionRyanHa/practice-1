# Project instructions

Before changing, testing, or previewing this project, read `PROJECT_CONTEXT.md` completely.

## Required preview behavior

- When the user asks for "테스트 사이트", "저번처럼 테스트", or asks to inspect the 칭호/shop section, do not open the normal root page.
- Start the local static server from this repository and open `http://127.0.0.1:8000/?preview=shop`.
- The `preview=shop` mode is specifically intended to bypass login and show the 칭호 상점 immediately.
- Do not replace this with `http://localhost:8000` or the normal login flow unless the user explicitly asks to test login/authentication.
- Preserve all unrelated user changes in the dirty worktree.

## Project memory

Keep `PROJECT_CONTEXT.md` current when a change materially affects screens, data flow, testing URLs, or important user preferences.
