# Changelog

## [1.14.1](https://github.com/cgoinglove/better-chatbot/compare/v1.14.0...v1.14.1) (2025-07-09)


### Bug Fixes

* tool select ui ([#141](https://github.com/cgoinglove/better-chatbot/issues/141)) ([0795524](https://github.com/cgoinglove/better-chatbot/commit/0795524991a7aa3e17990777ca75381e32eaa547))

## [1.14.0](https://github.com/cgoinglove/better-chatbot/compare/v1.13.0...v1.14.0) (2025-07-07)


### Features

* web-search with images ([bea76b3](https://github.com/cgoinglove/better-chatbot/commit/bea76b3a544d4cf5584fa29e5c509b0aee1d4fee)) by @cgoinglove
* **workflow:** add auto layout feature for workflow nodes and update UI messages ([0cfbffd](https://github.com/cgoinglove/better-chatbot/commit/0cfbffd631c9ae5c6ed57d47ca5f34b9acbb257d)) by @cgoinglove
* **workflow:** stable workflow  ( add example workflow : baby-research ) ([#137](https://github.com/cgoinglove/better-chatbot/issues/137)) ([c38a7ea](https://github.com/cgoinglove/better-chatbot/commit/c38a7ea748cdb117a4d0f4b886e3d8257a135956)) by @cgoinglove


### Bug Fixes

* **api:** handle error case in chat route by using orElse for unwrap ([25580a2](https://github.com/cgoinglove/better-chatbot/commit/25580a2a9f6c9fbc4abc29fee362dc4b4f27f9b4)) by @cgoinglove
* **workflow:** llm structure Output ([c529292](https://github.com/cgoinglove/better-chatbot/commit/c529292ddc1a4b836a5921e25103598afd7e3ab7)) by @cgoinglove

## [1.13.0](https://github.com/cgoinglove/better-chatbot/compare/v1.12.1...v1.13.0) (2025-07-04)


### Features

* Add web search and content extraction tools using Tavily API ([#126](https://github.com/cgoinglove/better-chatbot/issues/126)) ([f7b4ea5](https://github.com/cgoinglove/better-chatbot/commit/f7b4ea5828b33756a83dd881b9afa825796bf69f)) by @cgoing-bot


### Bug Fixes

* workflow condition node issue ([78b7add](https://github.com/cgoinglove/better-chatbot/commit/78b7addbba51b4553ec5d0ce8961bf90be5d649c)) by @cgoinglove
* **workflow:** improve mention handling by ensuring empty values are represented correctly ([92ff9c3](https://github.com/cgoinglove/better-chatbot/commit/92ff9c3e14b97d9f58a22f9df2559e479f14537c)) by @cgoinglove
* **workflow:** simplify mention formatting by removing bold styling for non-empty values ([ef65fd7](https://github.com/cgoinglove/better-chatbot/commit/ef65fd713ab59c7d8464cae480df7626daeff5cd)) by @cgoinglove

## [1.12.1](https://github.com/cgoinglove/better-chatbot/compare/v1.12.0...v1.12.1) (2025-07-02)


### Bug Fixes

* **workflow:** enhance structured output handling and improve user notifications ([dd43de9](https://github.com/cgoinglove/better-chatbot/commit/dd43de99881d64ca0c557e29033e953bcd4adc0e)) by @cgoinglove

## [1.12.0](https://github.com/cgoinglove/better-chatbot/compare/v1.11.0...v1.12.0) (2025-07-01)


### Features

* **chat:** enable [@mention](https://github.com/mention) and tool click to trigger workflow execution in chat ([#122](https://github.com/cgoinglove/better-chatbot/issues/122)) ([b4e7f02](https://github.com/cgoinglove/better-chatbot/commit/b4e7f022fa155ef70be2aee9228a4d1d2643bf10)) by @cgoing-bot


### Bug Fixes

* clean changlelog and stop duplicate attributions in the changelog file ([#119](https://github.com/cgoinglove/better-chatbot/issues/119)) ([aa970b6](https://github.com/cgoinglove/better-chatbot/commit/aa970b6a2d39ac1f0ca22db761dd452e3c7a5542)) by @brrock

## [1.11.0](https://github.com/cgoinglove/better-chatbot/compare/v1.10.0...v1.11.0) (2025-06-28)

### Features
* **workflow:** Add HTTP and Template nodes with LLM structured output supportWorkflow node ([#117](https://github.com/cgoinglove/better-chatbot/issues/117)) ([10ec438](https://github.com/cgoinglove/better-chatbot/commit/10ec438f13849f0745e7fab652cdd7cef8e97ab6)) by @cgoing-bot   by @cgoing-bot by @cgoing-bot by @cgoing-bot by @cgoing-bot
* **workflow:** add HTTP node configuration and execution support ([7d2f65f](https://github.com/cgoinglove/better-chatbot/commit/7d2f65fe4f0fdaae58ca2a69abb04abee3111c60)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove

### Bug Fixes
* add POST endpoint for MCP client saving with session validation ([fa005aa](https://github.com/cgoinglove/better-chatbot/commit/fa005aaecbf1f8d9279f5b4ce5ba85343e18202b)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* split theme system into base themes and style variants ([61ebd07](https://github.com/cgoinglove/better-chatbot/commit/61ebd0745bcfd7a84ba3ad65c3f52b7050b5131a)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* update ToolMessagePart to use isExecuting state instead of isExpanded ([752f8f0](https://github.com/cgoinglove/better-chatbot/commit/752f8f06e319119569e9ee7c04d621ab1c43ca54)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove

## [1.10.0](https://github.com/cgoinglove/better-chatbot/compare/v1.9.0...v1.10.0) (2025-06-27)

### Features
* **releases:** add debug logging to the add authors and update release step ([#105](https://github.com/cgoinglove/better-chatbot/issues/105)) ([c855a6a](https://github.com/cgoinglove/better-chatbot/commit/c855a6a94c49dfd93c9a8d1d0932aeda36bd6c7e)) by @brrock   by @brrock by @brrock by @brrock by @brrock
* workflow beta ([#100](https://github.com/cgoinglove/better-chatbot/issues/100)) ([2f5ada2](https://github.com/cgoinglove/better-chatbot/commit/2f5ada2a66e8e3cd249094be9d28983e4331d3a1)) by @cgoing-bot   by @cgoing-bot by @cgoing-bot by @cgoing-bot by @cgoing-bot

### Bug Fixes
* update tool selection logic in McpServerSelector to maintain current selections ([4103c1b](https://github.com/cgoinglove/better-chatbot/commit/4103c1b828c3e5b513679a3fb9d72bd37301f99d)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* **workflow:** MPC Tool Response Structure And Workflow ([#113](https://github.com/cgoinglove/better-chatbot/issues/113)) ([836ffd7](https://github.com/cgoinglove/better-chatbot/commit/836ffd7ef5858210bdce44d18ca82a1c8f0fc87f)) by @cgoing-bot   by @cgoing-bot by @cgoing-bot by @cgoing-bot by @cgoing-bot

## [1.9.0](https://github.com/cgoinglove/better-chatbot/compare/v1.8.0...v1.9.0) (2025-06-16)

### Features
* credit contributors in releases and changlogs ([#104](https://github.com/cgoinglove/better-chatbot/issues/104)) ([e0e4443](https://github.com/cgoinglove/better-chatbot/commit/e0e444382209a36f03b6e898f26ebd805032c306)) by @brrock   by @brrock by @brrock by @brrock by @brrock

### Bug Fixes
* increase maxTokens for title generation in chat actions issue [#102](https://github.com/cgoinglove/better-chatbot/issues/102) ([bea2588](https://github.com/cgoinglove/better-chatbot/commit/bea2588e24cf649133e8ce5f3b6391265b604f06)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* temporary chat initial model ([0393f7a](https://github.com/cgoinglove/better-chatbot/commit/0393f7a190463faf58cbfbca1c21d349a9ff05dc)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* update adding-openAI-like-providers.md ([#101](https://github.com/cgoinglove/better-chatbot/issues/101)) ([2bb94e7](https://github.com/cgoinglove/better-chatbot/commit/2bb94e7df63a105e33c1d51271751c7b89fead23)) by @brrock   by @brrock by @brrock by @brrock by @brrock
* update config file path in release workflow ([7209cbe](https://github.com/cgoinglove/better-chatbot/commit/7209cbeb89bd65b14aee66a40ed1abb5c5f2e018)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove

## [1.8.0](https://github.com/cgoinglove/better-chatbot/compare/v1.7.0...v1.8.0) (2025-06-11)

### Features
* add openAI compatible provider support ([#92](https://github.com/cgoinglove/better-chatbot/issues/92)) ([6682c9a](https://github.com/cgoinglove/better-chatbot/commit/6682c9a320aff9d91912489661d27ae9bb0f4440)) by @brrock   by @brrock by @brrock by @brrock by @brrock

### Bug Fixes
* Enhance component styles and configurations ([a7284f1](https://github.com/cgoinglove/better-chatbot/commit/a7284f12ca02ee29f7da4d57e4fe6e8c6ecb2dfc)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove

## [1.7.0](https://github.com/cgoinglove/better-chatbot/compare/v1.6.2...v1.7.0) (2025-06-06)

### Features
* Per User Custom instructions ([#86](https://github.com/cgoinglove/better-chatbot/issues/86)) ([d45c968](https://github.com/cgoinglove/better-chatbot/commit/d45c9684adfb0d9b163c83f3bb63310eef572279)) by @vineetu   by @vineetu by @vineetu by @vineetu by @vineetu

## [1.6.2](https://github.com/cgoinglove/better-chatbot/compare/v1.6.1...v1.6.2) (2025-06-04)

### Bug Fixes
* enhance error handling in chat bot component ([1519799](https://github.com/cgoinglove/better-chatbot/commit/15197996ba1f175db002b06e3eac2765cfae1518)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* improve session error handling in authentication ([eb15b55](https://github.com/cgoinglove/better-chatbot/commit/eb15b550facf5368f990d58b4b521bf15aecbf72)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* support OpenAI real-time chat project instructions ([2ebbb5e](https://github.com/cgoinglove/better-chatbot/commit/2ebbb5e68105ef6706340a6cfbcf10b4d481274a)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* unify SSE and streamable config as RemoteConfig ([#85](https://github.com/cgoinglove/better-chatbot/issues/85)) ([66524a0](https://github.com/cgoinglove/better-chatbot/commit/66524a0398bd49230fcdec73130f1eb574e97477)) by @cgoing-bot   by @cgoing-bot by @cgoing-bot by @cgoing-bot by @cgoing-bot

## [1.6.1](https://github.com/cgoinglove/better-chatbot/compare/v1.6.0...v1.6.1) (2025-06-02)

### Bug Fixes
* speech ux ([baa849f](https://github.com/cgoinglove/better-chatbot/commit/baa849ff2b6b147ec685c6847834385652fc3191)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove

## [1.6.0](https://github.com/cgoinglove/better-chatbot/compare/v1.5.2...v1.6.0) (2025-06-01)

### Features
* add husky for formatting and checking commits ([#71](https://github.com/cgoinglove/better-chatbot/issues/71)) ([a379cd3](https://github.com/cgoinglove/better-chatbot/commit/a379cd3e869b5caab5bcaf3b03f5607021f988ef)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* add Spanish, French, Japanese, and Chinese language support with UI improvements ([#74](https://github.com/cgoinglove/better-chatbot/issues/74)) ([e34d43d](https://github.com/cgoinglove/better-chatbot/commit/e34d43df78767518f0379a434f8ffb1808b17e17)) by @cgoing-bot   by @cgoing-bot by @cgoing-bot by @cgoing-bot by @cgoing-bot
* implement cold start-like auto connection for MCP server and simplify status ([#73](https://github.com/cgoinglove/better-chatbot/issues/73)) ([987c442](https://github.com/cgoinglove/better-chatbot/commit/987c4425504d6772e0aefe08b4e1911e4cb285c1)) by @cgoing-bot   by @cgoing-bot by @cgoing-bot by @cgoing-bot by @cgoing-bot

## [1.5.2](https://github.com/cgoinglove/better-chatbot/compare/v1.5.1...v1.5.2) (2025-06-01)

### Features
* Add support for Streamable HTTP Transport [#56](https://github.com/cgoinglove/better-chatbot/issues/56) ([8783943](https://github.com/cgoinglove/better-chatbot/commit/878394337e3b490ec2d17bcc302f38c695108d73)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* implement speech system prompt and update voice chat options for enhanced user interaction ([5a33626](https://github.com/cgoinglove/better-chatbot/commit/5a336260899ab542407c3c26925a147c1a9bba11)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* update MCP server UI and translations for improved user experience ([1e2fd31](https://github.com/cgoinglove/better-chatbot/commit/1e2fd31f8804669fbcf55a4c54ccf0194a7e797c)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove

### Bug Fixes
* enhance mobile UI experience with responsive design adjustments ([2eee8ba](https://github.com/cgoinglove/better-chatbot/commit/2eee8bab078207841f4d30ce7708885c7268302e)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove
* UI improvements for mobile experience ([#66](https://github.com/cgoinglove/better-chatbot/issues/66)) ([b4349ab](https://github.com/cgoinglove/better-chatbot/commit/b4349abf75de69f65a44735de2e0988c6d9d42d8)) by @cgoinglove   by @cgoinglove by @cgoinglove by @cgoinglove by @cgoinglove

### Miscellaneous Chores
* release 1.5.2 ([d185514](https://github.com/cgoinglove/better-chatbot/commit/d1855148cfa53ea99c9639f8856d0e7c58eca020)) by @cgoinglove
