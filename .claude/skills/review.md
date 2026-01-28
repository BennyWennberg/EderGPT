# Code Review

<skill_metadata>
<name>review</name>
<version>1.0.0</version>
<description>Reviews code for quality, bugs, security issues, and improvements</description>
<author>skill-creator</author>
</skill_metadata>

---

## Description

<description>
This skill performs a comprehensive code review on specified files, directories, or
git changes. It analyzes code for quality issues, potential bugs, security vulnerabilities,
performance concerns, and adherence to best practices. The review provides actionable
feedback with specific suggestions for improvement.

Review categories:
- **Bugs**: Logic errors, null references, race conditions
- **Security**: Injection vulnerabilities, exposed secrets, insecure patterns
- **Performance**: Inefficient algorithms, memory leaks, unnecessary operations
- **Maintainability**: Code complexity, duplication, unclear naming
- **Best Practices**: Language idioms, design patterns, error handling
- **Style**: Consistency, formatting, documentation
</description>

---

## Parameters

<parameters>
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | no | File path, directory, or git ref to review (default: staged changes) |
| focus | string | no | Focus area: bugs, security, performance, maintainability, all (default: all) |
| severity | string | no | Minimum severity to report: critical, high, medium, low (default: low) |
| format | string | no | Output format: detailed, summary, checklist (default: detailed) |
| diff | boolean | no | Review only changed lines in git diff (default: false) |
</parameters>

---

## Usage

<usage>
/review [target] [--focus AREA] [--severity LEVEL] [--format FORMAT] [--diff]
</usage>

---

## Instructions

<instructions>
When this skill is invoked:

1. **Determine review scope**
   - If target is a file path, read and review that file
   - If target is a directory, review all code files recursively
   - If target is a git ref (e.g., HEAD~3..HEAD), review those changes
   - If no target specified, review staged changes (`git diff --cached`)
   - If --diff flag is set, focus only on changed lines

2. **Gather context**
   - Identify the programming language(s)
   - Look for project configuration (package.json, pyproject.toml, etc.)
   - Check for existing linting/formatting rules
   - Understand the project structure and patterns

3. **Perform static analysis**
   - Analyze code structure and complexity
   - Check for common anti-patterns
   - Identify potential bugs and logic errors
   - Look for security vulnerabilities
   - Assess performance implications

4. **Categorize findings**
   - Assign severity: critical, high, medium, low
   - Assign category: bug, security, performance, maintainability, style
   - Note the specific file and line number
   - Provide clear explanation of the issue

5. **Generate recommendations**
   - For each finding, suggest a specific fix
   - Include code examples where helpful
   - Reference relevant documentation or best practices
   - Prioritize by severity and impact

6. **Format output**
   - **detailed**: Full explanation with code snippets and suggestions
   - **summary**: Brief list of issues grouped by severity
   - **checklist**: Actionable checklist format for quick fixes

7. **Provide summary**
   - Total issues by severity
   - Overall code quality assessment
   - Key areas needing attention
   - Positive observations (well-written code patterns)
</instructions>

---

## Examples

<examples>
### Example 1: Review Staged Changes
```
/review
```
Reviews all currently staged git changes with full analysis.

### Example 2: Review Specific File
```
/review src/auth/login.ts
```
Performs a comprehensive review of the specified file.

### Example 3: Security-Focused Review
```
/review src/api/ --focus security
```
Reviews the API directory with emphasis on security vulnerabilities.

### Example 4: Review Recent Commits
```
/review HEAD~5..HEAD --format summary
```
Reviews the last 5 commits in summary format.

### Example 5: High-Severity Only
```
/review --severity high --format checklist
```
Shows only critical and high severity issues as a checklist.

### Example 6: Review PR Changes
```
/review --diff
```
Reviews only the changed lines in the current diff.
</examples>

---

## Output Format

<output_format>
### Detailed Format Example:
```
## Code Review Results

### Critical Issues (1)

#### [CRITICAL] SQL Injection Vulnerability
- **File**: src/api/users.ts:45
- **Category**: Security
- **Issue**: User input directly concatenated into SQL query
- **Code**:
  ```typescript
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  ```
- **Recommendation**: Use parameterized queries
  ```typescript
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [userId]);
  ```

### High Issues (2)
...

### Summary
- Critical: 1
- High: 2
- Medium: 5
- Low: 3

Overall: Code requires attention before merge. Address critical security issue first.
```
</output_format>

---

## Error Handling

<error_handling>
- **File not found**: Report "File or directory not found: [path]. Please verify the path exists."
- **Binary file**: Skip binary files and note "Skipping binary file: [path]"
- **Permission denied**: Report "Cannot read file: [path]. Permission denied."
- **No changes to review**: "No changes found to review. Specify a file path or stage changes with git add."
- **Unknown language**: "Unable to determine language for [file]. Performing generic code review."
- **Large file warning**: For files over 1000 lines, warn "Large file detected. Review may be limited. Consider reviewing in sections."
- **Invalid git ref**: "Invalid git reference: [ref]. Please provide a valid commit, branch, or range."
</error_handling>
