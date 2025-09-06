# MCP Chatbot Project Goals & Research

## Project Vision

A sophisticated MCP-enabled chatbot that serves as both a **power-user research and development platform** and a **family-friendly AI assistant**, with advanced artifact generation capabilities and collaborative coding features.

## Core Goals

### 1. Multi-Tier User Experience

**Power User/Admin Setup**
- Full MCP server configuration and management
- Advanced tool integration and customization  
- Deep system access and debugging capabilities
- Complex workflow and automation support

**Family/Friends Access**
- Simplified, curated interface
- Pre-configured safe MCP tools
- Easy-to-use artifact generation
- Minimal setup requirements

### 2. Infrastructure Strategy

**Hosted Server Preference**
- Centralized deployment for reliability and maintenance
- Controlled environment for MCP server management
- Restricted general user setup to prevent complexity/security issues
- Admin-controlled tool and model access

### 3. Advanced Artifact Engine

**Multi-File Support Focus**
- Beyond single-file artifacts to complete project generation
- Inspiration from Bolt.new and bolt.dotdiy approaches
- File tree management and navigation
- Complex project scaffolding capabilities

**Previous Experiments**
- `bolt-port` - Basic bolt porting attempt
- `bolt-r2` - Second iteration with client package fixes  
- `bolt-port-r2` - Third iteration (marked as "broken")
- `bolt-port-spike` - Had some success ("Sort of working")
- `unocss-bolt` - UnoCSS integration attempt (never worked properly)

### 4. Web Container-Based Coding Tools

**Collaborative Development**
- Real-time code execution and preview
- Multi-user coding sessions ("vibe coding")
- Sandboxed environments for experimentation
- Integration with popular development workflows

### 5. Advanced Research Capabilities

**Deep Research Features**
- Comprehensive web search integration
- Multi-source information synthesis
- Citation and source tracking
- Research workflow automation

**Inspiration Sources**
- **Siri** - Natural interaction patterns
- **Perplexica** - Research-focused AI approach  
- **Other research tools** - Academic and professional research workflows

### 6. Upstream Integration Strategy

**Continuous Learning**
- Track useful features from upstream repositories
- Maintain research notes on promising developments
- Strategic feature porting based on value assessment
- Balance innovation adoption with system stability

---

## Research Notes & Upstream Inspirations

### Recent Upstream Analysis

#### Better-chatbot Upstream
- **Agent System**: Complex sharing and bookmark capabilities
- **Workflow System**: Visual workflow builder with node-based editing
- **AI SDK v5**: Latest features but breaking changes
- **Enhanced Voice Chat**: Improved real-time capabilities
- **Sequential Thinking Tool**: Advanced reasoning capabilities

#### Vercel AI Chatbot  
- **Enhanced Testing Suite**: Comprehensive Playwright tests
- **Security Improvements**: Ownership validation patterns
- **Better Error Handling**: Client disconnect management

#### Strategic Porting Decisions (Dec 2024)
**Priority 1**: Security improvements, PKCE OAuth fixes, error handling
**Priority 2**: Sequential thinking, enhanced MCP tools, testing suite
**Avoid**: Agent/workflow complexity, AI SDK v5 migration (major project)

### Multi-File Artifact Research

#### Bolt.new Analysis
- **Strengths**: Excellent multi-file project generation
- **Weaknesses**: Limited customization, vendor lock-in
- **Lessons**: File tree UI patterns, preview integration

#### WebContainer Integration Challenges
- **Technical Hurdles**: Browser compatibility, resource management
- **Alternative Approaches**: Server-side sandboxing, Docker integration
- **Future Investigation**: Stackblitz WebContainer API evolution

### Research Capability Inspirations

#### Perplexica Features to Study
- Source aggregation and ranking
- Research query decomposition  
- Citation management
- Multi-step research workflows

#### Advanced Search Integration
- **Web Search**: Beyond basic queries to research workflows
- **Academic Sources**: Scholar integration, paper analysis
- **Code Search**: Repository search, documentation crawling
- **Real-time Data**: News, market data, technical updates

---

## Future Research Areas

### Technical Investigations
- [ ] WebContainer alternatives for safe code execution
- [ ] Multi-file artifact streaming and diff management
- [ ] Advanced MCP tool composition patterns
- [ ] Research workflow automation frameworks

### User Experience Research  
- [ ] Power user vs casual user interface patterns
- [ ] Collaborative coding session management
- [ ] Research result presentation and organization
- [ ] Family-safe AI interaction guidelines

### Integration Opportunities
- [ ] Academic database integration (ArXiv, PubMed, etc.)
- [ ] Development tool ecosystem connections
- [ ] Social coding platform integration  
- [ ] Knowledge management system compatibility

---

## Ongoing Inspiration Tracking

### Repository Watch List
- `vercel/ai-chatbot` - Artifact and UI patterns
- `cgoinglove/better-chatbot` - MCP integration evolution
- `stackblitz/bolt.new` - Multi-file generation approaches
- `Perplexica/Perplexica` - Research-focused AI design
- `bolt-dotdiy/*` - Community bolt implementations

### Feature Pipeline
*Add discovered features here for future evaluation*

### Research Questions  
*Add ongoing research questions and investigation notes*

---

*This document serves as a living record of project goals, research findings, and strategic decisions. Expand sections as new insights and opportunities emerge.*