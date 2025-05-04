# MCP Client Chatbot

[![Local First](https://img.shields.io/badge/Local-First-blueviolet)](#)
[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)

**MCP Client Chatbot**은 [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Google](https://ai.google.dev/), [Ollama](https://ollama.com/)와 같은 다양한 AI 모델 제공업체를 지원하는 다목적 채팅 인터페이스입니다. **복잡한 설정 없이 100% 로컬 환경에서 즉시 실행되도록 설계**되어 사용자가 개인 컴퓨터나 서버의 컴퓨팅 리소스를 완전히 제어할 수 있습니다.

> [Vercel AI SDK](https://sdk.vercel.ai)와 [Next.js](https://nextjs.org/)로 구축된 이 앱은 AI 채팅 인터페이스 구축을 위한 현대적인 패턴을 채택했습니다. [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)의 강력한 기능을 활용하여 외부 도구를 채팅 경험에 원활하게 통합할 수 있습니다.

**🌟 오픈소스 프로젝트**
MCP Client Chatbot은 커뮤니티 주도의 100% 오픈소스 프로젝트입니다.

## 목차

- [MCP Client Chatbot](#mcp-client-chatbot)
  - [목차](#목차)
  - [데모](#데모)
    - [🧩 Playwright MCP를 통한 브라우저 자동화](#-playwright-mcp를-통한-브라우저-자동화)
    - [⚡️ 빠른 도구 언급 (`@`)](#️-빠른-도구-언급-)
    - [🔌 MCP 서버 쉽게 추가하기](#-mcp-서버-쉽게-추가하기)
    - [🛠️ 독립적인 도구 테스트](#️-독립적인-도구-테스트)
    - [📊 기본 차트 도구](#-기본-차트-도구)
  - [✨ 주요 기능](#-주요-기능)
  - [🚀 시작하기](#-시작하기)
    - [환경 변수](#환경-변수)
    - [MCP 서버 설정](#mcp-서버-설정)
  - [💡 팁 \& 가이드](#-팁--가이드)
  - [🗺️ 로드맵: 다음 기능](#️-로드맵-다음-기능)
    - [🚀 배포 \& 호스팅](#-배포--호스팅)
    - [🗣️ 오디오 \& 실시간 채팅](#️-오디오--실시간-채팅)
    - [📎 파일 \& 이미지](#-파일--이미지)
    - [🔄 MCP 워크플로우](#-mcp-워크플로우)
    - [🛠️ 기본 내장 도구 \& UX](#️-기본-내장-도구--ux)
    - [💻 LLM 코드 작성 (Daytona 연동)](#-llm-코드-작성-daytona-연동)
  - [🙌 기여하기](#-기여하기)

---

## 데모

MCP Client Chatbot을 사용할 수 있는 몇 가지 빠른 예시입니다:

---

### 🧩 Playwright MCP를 통한 브라우저 자동화

![playwright-demo](./images/preview-1.gif)

**예시:** Microsoft의 [playwright-mcp](https://github.com/microsoft/playwright-mcp) 도구를 사용하여 웹 브라우저를 제어합니다.

샘플 프롬프트:

```prompt
GitHub로 이동하여 cgoinglove 프로필을 방문해주세요.
mcp-client-chatbot 프로젝트를 열어주세요.
그런 다음, README.md 파일을 클릭 하세요.
완료 후, 브라우저를 닫아주세요.
마지막으로, 패키지 설치 방법을 알려주세요.
```
---

### ⚡️ 빠른 도구 언급 (`@`)

![mention](https://github.com/user-attachments/assets/1a80dd48-1d95-4938-b0d8-431c02ec2a53)

채팅 중에 `@도구이름`을 입력하여 등록된 MCP 도구를 빠르게 호출할 수 있습니다. 외울 필요 없이 `@`를 입력하고 목록에서 선택하세요!

**Tool Choice 모드**를 통해 도구 호출 방식도 조절할 수 있습니다:
- **Auto:** LLM이 판단하여 자동으로 도구를 실행합니다.
- **Manual:** 도구 실행 전 항상 사용자에게 확인을 요청합니다.
- **None:** 도구를 사용하지 않습니다.

---

### 🔌 MCP 서버 쉽게 추가하기

![mcp-server-install](https://github.com/user-attachments/assets/c71fd58d-b16e-4517-85b3-160685a88e38)

UI를 통해 새로운 MCP 서버를 쉽게 추가하고, 앱을 재시작하지 않고도 새로운 도구를 사용할 수 있습니다.

---

### 🛠️ 독립적인 도구 테스트

![tool-test](https://github.com/user-attachments/assets/980dd645-333f-4e5c-8ac9-3dc59db19e14)

더 쉬운 개발과 디버깅을 위해 채팅 세션과 독립적으로 MCP 도구를 테스트할 수 있습니다.


### 📊 기본 차트 도구

![May-04-2025 01-55-04](https://github.com/user-attachments/assets/7bf9d895-9023-44b1-b7f2-426ae4d7d643)

챗봇이 응답한 데이터를 기반으로, 파이 / 막대 / 선형 차트 등 다양한 형태로 시각화할 수 있는 기본 내장 툴이 제공됩니다.

---

## ✨ 주요 기능

* **💻 100% 로컬 실행:** 복잡한 배포 없이 PC나 서버에서 직접 실행하여 컴퓨팅 리소스를 완전히 활용하고 제어합니다.
* **🤖 다중 AI 모델 지원:** OpenAI, Anthropic, Google AI, Ollama와 같은 제공업체 간에 유연하게 전환할 수 있습니다.
* **🛠️ 강력한 MCP 통합:** Model Context Protocol을 통해 외부 도구(브라우저 자동화, 데이터베이스 작업 등)를 채팅에 원활하게 연결합니다.
* **🚀 독립 도구 테스터:** 주 채팅 인터페이스와 별도로 MCP 도구를 테스트하고 디버깅할 수 있습니다.
* **💬 직관적인 멘션 + 도구 제어:** 입력 필드에서 `@`로 사용 가능한 도구를 트리거하고,  
Tool Choice 모드(`Auto`, `Manual`, `None`)로 도구 호출 방식을 직접 제어할 수 있습니다.
* **⚙️ 쉬운 서버 설정:** UI 또는 `.mcp-config.json` 파일을 통해 MCP 연결을 구성합니다.
* **📄 마크다운 UI:** 깔끔하고 읽기 쉬운 마크다운 기반 인터페이스로 소통합니다.
* **💾 설정 필요 없는 로컬 DB:** 기본적으로 로컬 저장소로 SQLite를 사용합니다(PostgreSQL도 지원).
* **🧩 커스텀 MCP 서버 지원:** 내장된 MCP 서버 로직을 수정하거나 직접 만들 수 있습니다.
* **📊 기본 제공 차트 도구:** 챗봇이 응답한 데이터를 기반으로, 파이 / 막대 / 선형 차트 등 다양한 형태로 시각화할 수 있는 기본 내장 툴이 제공됩니다.

## 🚀 시작하기

이 프로젝트는 [pnpm](https://pnpm.io/)을 권장 패키지 매니저로 사용합니다.

```bash
# 1. 의존성 설치
pnpm i

# 2. 프로젝트 초기화(.env 생성, DB 설정)
pnpm initial

# 3. 개발 서버 시작
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 시작하세요.

-----

### 환경 변수

`pnpm initial` 명령은 `.env` 파일을 생성합니다. 여기에 API 키를 추가하세요:

```dotenv
GOOGLE_GENERATIVE_AI_API_KEY=****
OPENAI_API_KEY=****
# ANTHROPIC_API_KEY=****
```

SQLite가 기본 DB(`db.sqlite`)입니다. PostgreSQL을 사용하려면 `.env`에서 `USE_FILE_SYSTEM_DB=false`로 설정하고 `DATABASE_URL`을 정의하세요.

-----

### MCP 서버 설정

다음과 같은 방법으로 MCP 도구를 연결할 수 있습니다:

1. **UI 설정:** http://localhost:3000/mcp로 이동하여 인터페이스를 통해 구성합니다.
2. **직접 파일 편집:** 프로젝트 루트의 `.mcp-config.json`을 수정합니다.
3. **커스텀 로직:** `./custom-mcp-server/index.ts`를 편집하여 자체 로직을 구현합니다.

-----

## 💡 팁 & 가이드

MCP Client Chatbot을 효과적으로 활용하기 위한 실용적인 팁과 가이드를 소개합니다:

* [GitHub MCP 서버를 활용한 프로젝트 기능](./tips-guides/project_with_mcp.md): 시스템 프롬프트와 MCP 서버를 연동하여 GitHub 기반 프로젝트 관리를 도와주는 에이전트를 만드는 방법을 안내합니다.
* **Docker 호스팅 가이드**: *곧 추가될 예정입니다...*

-----

## 🗺️ 로드맵: 다음 기능

MCP Client Chatbot은 아래와 같은 기능들을 곧 지원할 예정입니다.

### 🚀 배포 & 호스팅
- **셀프 호스팅:**  
  - Docker Compose로 간편하게 직접 배포  
  - Vercel 배포 지원 (MCP Server: SSE only)

### 🗣️ 오디오 & 실시간 채팅
- **오픈 오디오 실시간 채팅:**  
  - MCP Server와 연동되는 실시간 음성 채팅

### 📎 파일 & 이미지
- **파일 첨부 및 이미지 생성:**  
  - 파일 업로드 및 이미지 생성  
  - 멀티모달 대화 지원

### 🔄 MCP 워크플로우
- **MCP 플로우:**  
  - MCP Server와 연동되는 워크플로우 자동화

### 🛠️ 기본 내장 도구 & UX
- **챗봇 기본 도구:**  
  - 문서 협업 편집(예: OpenAI Canvas처럼 사용자와 어시스턴트가 함께 편집)  
  - RAG(검색 기반 생성)  
  - 챗봇 UX를 위한 다양한 내장 도구 (MCP 없이도 사용 가능)

### 💻 LLM 코드 작성 (Daytona 연동)
- **Daytona 연동을 통한 LLM 기반 코드 작성 및 편집**
  - Daytona 기반 클라우드 개발 환경에서 LLM이 코드를 작성, 편집, 실행까지 한 번에 지원합니다. AI의 도움으로 코드를 즉시 생성·수정·실행할 수 있으며, 별도의 로컬 환경 설정이 필요하지 않습니다.

💡 필요한 기능이나 제안이 있다면 언제든 [이슈](https://github.com/cgoinglove/mcp-client-chatbot/issues)에 남겨주세요!

-----

## 🙌 기여하기

모든 기여를 환영합니다! 버그 보고, 기능 아이디어, 코드 개선 - 모든 것이 최상의 로컬 AI 어시스턴트를 구축하는 데 도움이 됩니다.

함께 만들어 나갑시다 🚀


