# MCP 클라이언트 챗봇

[![Local First](https://img.shields.io/badge/Local-First-blueviolet)](#)
[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)
[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WinstonFassett/mcp-client-chatbot&env=BETTER_AUTH_SECRET&env=OPENAI_API_KEY&env=GOOGLE_GENERATIVE_AI_API_KEY&env=ANTHROPIC_API_KEY&envDescription=애플리케이션용+API+키+가져오는+방법+알아보기&envLink=https://github.com/WinstonFassett/mcp-client-chatbot/blob/main/.env.example&demo-title=MCP+클라이언트+챗봇&demo-description=Next.js와+Vercel의+AI+SDK로+구축된+오픈소스+MCP+챗봇+템플릿입니다.&products=[{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"}])

**MCP 클라이언트 챗봇**은 [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Gemini](https://gemini.google.com/), [Ollama](https://ollama.com/) 등 다양한 AI 모델 공급업체를 지원하는 다재다능한 채팅 인터페이스입니다.

또한 MCP 서버 지원이 통합된 최초의 음성 기반 챗봇으로, 실시간 멀티모달 상호작용을 지원합니다.

우리의 목표는 언어 모델과 도구 오케스트레이션의 최고를 결합하여 **가장 강력한 도구 사용 챗봇**을 구축하는 것입니다.

LLM이 능동적으로 도구를 사용할 수 있도록 하는 다양한 UX와 기능을 만드는 것을 목표로 합니다. 예를 들어 직접 호출을 위한 `@도구` 멘션, **음성 기반 채팅에서 MCP 서버 도구에 액세스하고 사용**할 수 있는 기능, 빠른 선택을 위한 빠른 도구 프리셋, 그리고 곧 출시될 **도구를 활용한 워크플로우** 기능을 통한 다단계 자동화 등이 있습니다.

> [Vercel AI SDK](https://sdk.vercel.ai)와 [Next.js](https://nextjs.org/)로 구축된 이 앱은 AI 채팅 인터페이스 구축을 위한 현대적인 패턴을 채택합니다. [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)의 힘을 활용하여 외부 도구를 채팅 경험에 완벽하게 통합하세요.

**🌟 오픈소스 프로젝트**
MCP 클라이언트 챗봇은 100% 커뮤니티 주도 오픈소스 프로젝트입니다.

## 목차

- [MCP 클라이언트 챗봇](#mcp-클라이언트-챗봇)
  - [목차](#목차)
  - [데모](#데모)
    - [🧩 Playwright MCP를 활용한 브라우저 자동화](#-playwright-mcp를-활용한-브라우저-자동화)
    - [⚡️ 빠른 도구 멘션 (`@`)](#️-빠른-도구-멘션-)
    - [🔌 MCP 서버 쉽게 추가하기](#-mcp-서버-쉽게-추가하기)
    - [🛠️ 독립적인 도구 테스트](#️-독립적인-도구-테스트)
    - [📊 내장 차트 도구](#-내장-차트-도구)
  - [✨ 주요 기능](#-주요-기능)
    - [빠른 시작 (로컬 버전) 🚀](#빠른-시작-로컬-버전-)
    - [빠른 시작 (Docker Compose 버전) 🐳](#빠른-시작-docker-compose-버전-)
    - [환경 변수](#환경-변수)
    - [MCP 서버 설정](#mcp-서버-설정)
  - [💡 팁 \& 가이드](#-팁--가이드)
    - [Docker 호스팅 가이드:](#docker-호스팅-가이드)
    - [Vercel 호스팅 가이드:](#vercel-호스팅-가이드)
    - [OAuth Setup Guide (Google \& GitHub):](#oauth-setup-guide-google--github)
    - [MCP 서버와 함께하는 프로젝트 기능:](#mcp-서버와-함께하는-프로젝트-기능)
  - [🗺️ 로드맵: 다음 기능들](#️-로드맵-다음-기능들)
    - [🚀 배포 \& 호스팅 ✅](#-배포--호스팅-)
    - [📎 파일 \& 이미지](#-파일--이미지)
    - [🔄 MCP 워크플로우](#-mcp-워크플로우)
    - [🛠️ 내장 도구 \& UX](#️-내장-도구--ux)
    - [💻 LLM 코드 작성 (Daytona와 함께)](#-llm-코드-작성-daytona와-함께)
  - [🙌 기여하기](#-기여하기)
  - [💬 Discord 참여하기](#-discord-참여하기)

---

## 데모

MCP 클라이언트 챗봇을 사용하는 방법에 대한 몇 가지 빠른 예시입니다:

### 🧩 Playwright MCP를 활용한 브라우저 자동화

![playwright-demo](./images/preview-1.gif)

**예시:** Microsoft의 [playwright-mcp](https://github.com/microsoft/playwright-mcp) 도구를 사용하여 웹 브라우저를 제어합니다.

샘플 프롬프트:

```prompt
GitHub에 가서 WinstonFassett 프로필을 방문해주세요.
mcp-client-chatbot 프로젝트를 열어주세요.
그다음 README.md 파일을 클릭해주세요.
그 후 브라우저를 닫아주세요.
마지막으로 패키지를 설치하는 방법을 알려주세요.
```

---

### ⚡️ 빠른 도구 멘션 (`@`)

![mention](https://github.com/user-attachments/assets/1a80dd48-1d95-4938-b0d8-431c02ec2a53)

채팅 중에 `@도구명`을 입력하여 등록된 MCP 도구를 빠르게 호출하세요.
외울 필요 없이 `@`만 입력하고 목록에서 선택하세요!

새로운 **도구 선택 모드**로 도구 사용 방법을 제어할 수도 있습니다:

- **자동:** 필요할 때 모델이 자동으로 도구를 호출합니다.
- **수동:** 모델이 도구를 호출하기 전에 사용자의 허가를 요청합니다.
- **없음:** 모든 도구 사용을 비활성화합니다.

단축키 `⌘P`로 언제든지 모드를 전환할 수 있습니다.

---

### 🔌 MCP 서버 쉽게 추가하기

![mcp-server-install](https://github.com/user-attachments/assets/c71fd58d-b16e-4517-85b3-160685a88e38)

UI를 통해 새로운 MCP 서버를 쉽게 추가하고, 앱을 재시작하지 않고도 새로운 도구를 사용할 수 있습니다.

---

### 🛠️ 독립적인 도구 테스트

![tool-test](https://github.com/user-attachments/assets/980dd645-333f-4e5c-8ac9-3dc59db19e14)

채팅 세션과 독립적으로 MCP 도구를 테스트하여 개발과 디버깅을 간소화합니다.

### 📊 내장 차트 도구

![May-04-2025 01-55-04](https://github.com/user-attachments/assets/7bf9d895-9023-44b1-b7f2-426ae4d7d643)

내장 도구를 사용하여 챗봇 응답을 원형, 막대 또는 선 차트로 시각화하세요. 대화 중 빠른 데이터 인사이트에 완벽합니다.

---

## ✨ 주요 기능

- **💻 100% 로컬 실행:** 복잡한 배포 없이 PC나 서버에서 직접 실행하여 컴퓨팅 리소스를 완전히 활용하고 제어합니다.
- **🤖 다중 AI 모델 지원:** OpenAI, Anthropic, Google AI, Ollama 등의 제공업체 간 유연한 전환이 가능합니다.
- **🗣️ MCP 서버를 활용한 실시간 음성 채팅:** 현재 **OpenAI** 제공업체를 지원합니다 (Gemini 지원 예정)
- **🛠️ 강력한 MCP 통합:** Model Context Protocol을 통해 외부 도구(브라우저 자동화, 데이터베이스 작업 등)를 채팅에 완벽하게 연결합니다.
- **🚀 독립적인 도구 테스터:** 메인 채팅 인터페이스와 별도로 MCP 도구를 테스트하고 디버그합니다.
- **💬 직관적인 멘션 + 도구 제어:** `@`로 도구를 트리거하고 `자동` / `수동` / `없음` 모드를 통해 사용 시점을 제어합니다.
- **⚙️ 쉬운 서버 설정:** UI 또는 `.mcp-config.json` 파일을 통해 MCP 연결을 구성합니다.
- **📄 마크다운 UI:** 깔끔하고 읽기 쉬운 마크다운 기반 인터페이스에서 소통합니다.
- **🧩 커스텀 MCP 서버 지원:** 내장 MCP 서버 로직을 수정하거나 직접 만들 수 있습니다.
- **📊 내장 차트 도구:** 자연어 프롬프트로 채팅에서 직접 원형, 막대, 선 차트를 생성합니다.
- **🛫 쉬운 배포:** Vercel 지원이 내장되어 쉽게 접근 가능한 챗봇을 만들 수 있습니다.
- **🏃 어디서나 실행:** Docker Compose로 쉽게 실행 - 이미지를 빌드하고 실행하기만 하면 됩니다.

> 이 프로젝트는 권장 패키지 매니저로 [pnpm](https://pnpm.io/)을 사용합니다.

```bash
# pnpm이 없는 경우:
npm install -g pnpm
```

### 빠른 시작 (로컬 버전) 🚀

```bash
# 1. 의존성 설치
pnpm i

# 2. 환경 변수 파일을 생성하고 .env 값을 입력
pnpm initial:env # 이것은 postinstall에서 자동으로 실행되므로 일반적으로 건너뛸 수 있습니다.

# 3. (선택사항) PostgreSQL이 이미 실행 중이고 .env가 구성되어 있다면 이 단계를 건너뜁니다
pnpm docker:pg

# 4. 데이터베이스 마이그레이션 실행
pnpm db:migrate

# 5. 개발 서버 시작
pnpm dev

# 6. (선택사항) 로컬 프로덕션 테스트를 위한 빌드 & 시작
pnpm build:local && pnpm start
# 올바른 쿠키 설정을 위해 로컬 시작 시 build:local을 사용하세요
```

### 빠른 시작 (Docker Compose 버전) 🐳

```bash
# 1. 의존성 설치
pnpm i

# 2. 환경 변수 파일을 생성하고 필요한 값을 입력
pnpm initial:env # 이것은 postinstall에서 자동으로 실행되므로 일반적으로 건너뛸 수 있습니다.

# 3. Docker Compose로 모든 서비스(PostgreSQL 포함) 빌드 및 시작
pnpm docker-compose:up
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 시작하세요.

---

### 환경 변수

`pnpm i` 명령어가 `.env` 파일을 생성합니다. 여기에 API 키를 추가하세요.

```dotenv
# === LLM 제공업체 API 키 ===
# 사용할 제공업체의 키만 입력하면 됩니다
GOOGLE_GENERATIVE_AI_API_KEY=****
OPENAI_API_KEY=****
XAI_API_KEY=****
ANTHROPIC_API_KEY=****
OPENROUTER_API_KEY=****
OLLAMA_BASE_URL=http://localhost:11434/api

# Better Auth용 시크릿 (생성: npx @better-auth/cli@latest secret)
BETTER_AUTH_SECRET=****

# === 데이터베이스 ===
# PostgreSQL이 로컬에서 실행되지 않는 경우: pnpm docker:pg로 시작
POSTGRES_URL=postgres://your_username:your_password@localhost:5432/your_database_name

# 파일 기반 MCP 구성 사용 여부 (기본값: false)
FILE_BASED_MCP_CONFIG=false

# === OAuth 설정 (선택사항) ===
# Google/GitHub 로그인을 활성화하려는 경우에만 이 값들을 입력하세요
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

### MCP 서버 설정

다음 방법으로 MCP 도구를 연결할 수 있습니다:

1. **UI 설정:** http://localhost:3000/mcp 로 가서 인터페이스를 통해 구성합니다.
2. **커스텀 로직:** `./custom-mcp-server/index.ts`를 편집하여 자체 로직을 구현합니다. 이는 Vercel이나 Docker에서는 실행되지 않습니다.
3. **로컬 개발용 파일 기반:** `.mcp-config.json`을 만들고 서버를 넣습니다. 로컬 개발에서만 작동하며, Docker나 Vercel 환경 변수가 필요하지 않습니다. 예를 들어:

```jsonc
// .mcp-config.json
{
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  }
}
```

## 💡 팁 & 가이드

MCP 클라이언트 챗봇 사용에 대한 몇 가지 실용적인 팁과 가이드입니다:

### [Docker 호스팅 가이드](./tips-guides/docker.md):

Docker 설정 방법을 배워보세요.

### [Vercel 호스팅 가이드](./tips-guides/vercel.md):

Vercel 설정 방법을 배워보세요.

### [OAuth Setup Guide (Google & GitHub)](./tips-guides/oauth.md):

Learn how to configure Google and GitHub OAuth for login functionality.

### [MCP 서버와 함께하는 프로젝트 기능](./tips-guides/project_with_mcp.md):

시스템 지시사항과 구조를 MCP 서버와 통합하여 GitHub 기반 프로젝트 관리를 도와주는 에이전트를 구축하는 방법을 배워보세요.

## 🗺️ 로드맵: 다음 기능들

MCP 클라이언트 챗봇은 다음과 같은 예정된 기능들과 함께 발전하고 있습니다:

### 🚀 배포 & 호스팅 ✅

- **셀프 호스팅:** ✅
  - Docker Compose를 통한 쉬운 배포 ✅
  - Vercel 배포 지원 (MCP 서버: SSE만) ✅

### 📎 파일 & 이미지

- **파일 첨부 & 이미지 생성:**
  - 파일 업로드 및 이미지 생성
  - 멀티모달 대화 지원

### 🔄 MCP 워크플로우

- **MCP 플로우:**
  - MCP 서버 통합을 통한 워크플로우 자동화

### 🛠️ 내장 도구 & UX

- **챗봇용 기본 도구:**
  - 협업 문서 편집 (OpenAI Canvas처럼: 사용자 & 어시스턴트 공동 편집)
  - RAG (검색 증강 생성)
  - 챗봇 UX용 유용한 내장 도구들 (MCP 없이 사용 가능)

### 💻 LLM 코드 작성 (Daytona와 함께)

- **Daytona 통합을 활용한 LLM 기반 코드 작성 및 편집**
  - Daytona 통합을 통한 클라우드 개발 환경에서의 완벽한 LLM 기반 코드 작성, 편집 및 실행. AI 지원으로 즉시 코드를 생성, 수정 및 실행 - 로컬 설정이 필요하지 않습니다.

💡 제안이나 특정 기능이 필요하시면 [이슈](https://github.com/WinstonFassett/mcp-client-chatbot/issues)를 생성해주세요!

## 🙌 기여하기

모든 기여를 환영합니다! 버그 리포트, 기능 아이디어, 코드 개선 - 모든 것이 최고의 로컬 AI 어시스턴트를 구축하는 데 도움이 됩니다.

함께 만들어 갑시다 🚀

## 💬 Discord 참여하기

[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

커뮤니티와 연결하고, 질문하고, 공식 Discord 서버에서 지원을 받으세요!
