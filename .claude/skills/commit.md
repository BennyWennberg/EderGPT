# Git Commit

<skill_metadata>
<name>commit</name>
<version>1.0.0</version>
<description>Creates a well-formatted git commit with conventional commit message</description>
<author>skill-creator</author>
</skill_metadata>

---

## Description

<description>
This skill analyzes staged changes and creates a git commit following
conventional commit format (https://www.conventionalcommits.org/). It automatically
detects the type of changes, determines an appropriate scope, and generates a
clear, descriptive commit message. The skill ensures consistency in commit history
and makes the project changelog more readable.

Conventional commit format: `type(scope): description`

Common types:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvements
- **test**: Adding or correcting tests
- **build**: Build system or external dependency changes
- **ci**: CI configuration changes
- **chore**: Other changes that don't modify src or test files
</description>

---

## Parameters

<parameters>
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | no | Override automatic commit message with custom message |
| type | string | no | Commit type: feat, fix, docs, style, refactor, perf, test, build, ci, chore |
| scope | string | no | Scope of the change (e.g., auth, api, ui) |
| breaking | boolean | no | Mark as breaking change (adds ! after type) |
| body | string | no | Extended description for commit body |
</parameters>

---

## Usage

<usage>
/commit [-m "custom message"] [--type TYPE] [--scope SCOPE] [--breaking] [--body "extended description"]
</usage>

---

## Instructions

<instructions>
When this skill is invoked:

1. **Check for staged changes**
   - Run `git status` to see current state
   - If no staged changes exist, check for unstaged changes and prompt user to stage files first
   - List the files that would be committed

2. **Analyze the changes**
   - Run `git diff --cached` to examine staged changes
   - Run `git diff --cached --stat` for a summary view
   - Identify the nature of changes (new features, fixes, refactoring, etc.)

3. **Determine commit type** (if not provided)
   - New functionality or features -> `feat`
   - Bug fixes or error corrections -> `fix`
   - Documentation changes (README, comments, docs/) -> `docs`
   - Formatting, whitespace, missing semicolons -> `style`
   - Code restructuring without behavior change -> `refactor`
   - Performance improvements -> `perf`
   - Test additions or modifications -> `test`
   - Build configuration, dependencies -> `build`
   - CI/CD configuration -> `ci`
   - Maintenance tasks, tooling -> `chore`

4. **Determine scope** (if not provided)
   - Identify the primary area affected (e.g., auth, api, ui, db)
   - Use the most specific meaningful scope
   - Omit scope if changes are broad or don't fit a specific area

5. **Generate commit message**
   - Format: `type(scope): description` or `type: description`
   - Description should be imperative mood ("add" not "added")
   - Keep description under 72 characters
   - Add `!` before `:` if breaking change
   - Add body if extended explanation is needed

6. **Execute the commit**
   - Use HEREDOC format for multi-line messages
   - Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commit body
   - Report the commit hash on success

7. **Verify and report**
   - Run `git log -1` to confirm the commit
   - Display the commit details to the user
</instructions>

---

## Examples

<examples>
### Example 1: Automatic Commit
```
/commit
```
Analyzes staged changes and creates an appropriate commit message automatically.
Output: `feat(auth): add OAuth2 login support`

### Example 2: Custom Message
```
/commit -m "fix(api): resolve null pointer in user endpoint"
```
Uses the provided message directly without automatic generation.

### Example 3: Specify Type
```
/commit --type docs
```
Generates a documentation commit message for the staged changes.
Output: `docs(readme): update installation instructions`

### Example 4: Breaking Change
```
/commit --type feat --scope api --breaking
```
Creates a breaking change commit.
Output: `feat(api)!: restructure authentication endpoints`

### Example 5: With Extended Body
```
/commit --type fix --scope db --body "This fixes the race condition in connection pooling that caused intermittent failures under load."
```
Creates a commit with an extended description in the body.
</examples>

---

## Error Handling

<error_handling>
- **No staged changes**: Display message "No staged changes found. Please stage your changes first with `git add <files>` or `git add -p` for interactive staging."
- **Empty working directory**: Inform user "No changes detected in the repository."
- **Commit hook failure**: Report the specific hook error, show the hook output, and suggest potential fixes (e.g., linting errors, test failures)
- **Invalid commit type**: Show list of valid types and ask user to choose one
- **Message too long**: Warn user if description exceeds 72 characters and suggest truncation
- **Merge conflict state**: Warn user that repository is in merge conflict state and suggest resolving conflicts first
- **Detached HEAD state**: Warn user about detached HEAD and suggest creating a branch
</error_handling>
