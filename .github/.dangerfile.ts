// @ts-nocheck
import { danger, fail, warn, message } from "danger";

const prTitle = danger.github.pr.title;
const conventionalRegex =
  /^(feat|fix|chore|docs|style|refactor|test|perf|build|ci|revert)(\(.+\))?!?: .+/;

if (!conventionalRegex.test(prTitle)) {
  fail(
    `❌ The PR title does not follow the Conventional Commit format.

**Current title:** "${prTitle}"

**Expected formats:**
- \`feat: add login functionality\`
- \`fix: correct redirect bug\`
- \`chore: update dependency xyz\`
- \`feat(auth): add OAuth integration\`

**Supported prefixes:**
- \`feat\` - new features
- \`fix\` - bug fixes
- \`chore\` - maintenance tasks
- \`docs\` - documentation changes
- \`style\` - formatting changes
- \`refactor\` - code refactoring
- \`test\` - test additions/changes
- \`perf\` - performance improvements
- \`build\` - build system changes
- \`ci\` - CI configuration changes
- \`revert\` - reverting changes

Please update your PR title to match one of these formats.`,
  );
} else {
  message("✅ PR title follows Conventional Commit format!");
}

if (prTitle.length > 100) {
  warn("⚠️ PR title is quite long. Consider keeping it under 100 characters.");
}

if (prTitle.length < 10) {
  warn("⚠️ PR title seems too short. Consider being more descriptive.");
}
