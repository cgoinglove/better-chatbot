# Contributing to better-chatbot

Thank you for your interest in contributing to better-chatbot! We welcome contributions from the community and truly appreciate your effort to improve the project.

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
   * Include **screenshots or demos** for any UI changes

---

## Thank You

We sincerely appreciate your contribution to better-chatbot.
Let’s build a powerful and lightweight AI experience together! 🚀
