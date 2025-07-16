# Contributing to better-chatbot

Thank you for your interest in contributing to better-chatbot! We welcome contributions from the community and truly appreciate your effort to improve the project.

---

## Before You Start

### 🚨 Feature Requests & Major Changes

**For new features or significant changes, please create an issue first to discuss your idea before submitting a PR.**

This helps us:
- Align on the feature direction and design
- Avoid duplicate work
- Ensure the feature fits with the project roadmap
- Save your valuable time on implementation

**What requires discussion:**
- New UI components or major UI changes
- New API endpoints or data models
- Integration with external services
- Performance optimizations that change behavior
- Breaking changes

**What doesn't require discussion:**
- Bug fixes
- Documentation improvements
- Minor UI tweaks
- Code refactoring (without behavior changes)

---

## Getting Started

1. **Fork this repository** on GitHub.

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/better-chatbot.git
   cd better-chatbot
   ```

3. **Create a new branch** for your changes:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Implement your changes**, following the existing code style and structure.

5. **Test your changes thoroughly**:

   ```bash
   pnpm dev
   pnpm test
   ```

---

## Releasing and PR Title Rules

We use [Release Please](https://github.com/googleapis/release-please) to automate GitHub releases.
**Only the Pull Request title** needs to follow the [Conventional Commits](https://www.conventionalcommits.org/) format. Commit messages can be written freely.

### ✅ PR Title Examples

* `fix: voice chat audio not initializing`
* `feat: support multi-language UI toggle`
* `chore: update dependencies`

### ⚠️ Important Notes

* PR **titles must start** with one of the following prefixes:

  ```
  feat: ...
  fix: ...
  chore: ...
  docs: ...
  style: ...
  refactor: ...
  test: ...
  perf: ...
  build: ...
  ```

* Only the PR title is used for changelog and versioning

* We use **squash merge** to keep the history clean

* Changelog entries and GitHub Releases are **automatically generated** after merging

---

## Submitting a Pull Request

1. **Format your code**:

   ```bash
   pnpm lint:fix
   ```

2. **Commit and push**:

   ```bash
   git add .
   git commit -m "your internal message"
   git push origin your-branch-name
   ```

3. **Open a Pull Request**:

   * **Title**: Must follow the Conventional Commit format
   * **Description**: Explain what you changed and why
   * Link to related issues, if any
   * **Include screenshots or demos** for any UI changes:
     - **Before/After images** are highly recommended
     - **Screen recordings** for interactive features
     - **Mobile/Desktop views** if responsive changes are made

### 📸 Visual Documentation Guidelines

When submitting **Issues** or **Pull Requests**:

**For UI changes:**
- **Always include before/after screenshots** when possible
- Use **clear, high-quality images** that show the changes
- **Highlight the changed areas** with arrows or borders if needed
- For **responsive changes**, include both desktop and mobile views
- For **interactive features**, consider adding a short screen recording

**For feature requests:**
- Include **reference images** or **mockups** to illustrate your idea
- Add **screenshots from similar apps** if applicable
- Use **diagrams** to explain complex workflows or integrations

**For bug reports:**
- Include **screenshots** showing the issue
- Add **console errors** or **network logs** if relevant
- Show **expected vs actual behavior** with images when possible

**Example:**
```markdown
## Before
![before](./before-image.png)

## After  
![after](./after-image.png)

## Reference
![reference](./reference-design.png)
```

---

## Thank You

We sincerely appreciate your contribution to better-chatbot.
Let’s build a powerful and lightweight AI experience together! 🚀
