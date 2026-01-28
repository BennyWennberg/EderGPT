# Document

<skill_metadata>
<name>document</name>
<version>1.0.0</version>
<description>Generates documentation for code or features</description>
<author>skill-creator</author>
</skill_metadata>

---

## Description

<description>
This skill generates documentation for code, APIs, features, or entire projects.
It analyzes the code structure and creates appropriate documentation following
best practices and project conventions. The skill supports multiple documentation
formats and can generate inline documentation, API docs, README files, and more.

Documentation types:
- **inline**: JSDoc, docstrings, or language-specific inline comments
- **api**: API endpoint documentation (OpenAPI/Swagger style)
- **readme**: Project or module README files
- **module**: Module/package documentation
- **changelog**: Change log entries
- **architecture**: System architecture documentation
</description>

---

## Parameters

<parameters>
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | no | File, function, or directory to document (default: current directory) |
| type | string | no | Documentation type: inline, api, readme, module, changelog, architecture (default: inline) |
| format | string | no | Output format: markdown, jsdoc, docstring, rst (default: auto-detect) |
| output | string | no | Output file path (default: stdout or appropriate location) |
| update | boolean | no | Update existing documentation instead of replacing (default: false) |
</parameters>

---

## Usage

<usage>
/document [target] [--type TYPE] [--format FORMAT] [--output PATH] [--update]
</usage>

---

## Instructions

<instructions>
When this skill is invoked:

### For `inline` documentation:

1. **Analyze the code**
   - Read the target file or function
   - Identify all functions, classes, methods, and interfaces
   - Understand parameters, return types, and behavior
   - Note any existing documentation

2. **Generate documentation comments**
   - Use appropriate format for the language:
     - JavaScript/TypeScript: JSDoc
     - Python: docstrings (Google or NumPy style)
     - Java: Javadoc
     - Rust: rustdoc
     - Go: godoc
   - Include:
     - Brief description
     - Parameter descriptions with types
     - Return value description
     - Throws/raises documentation
     - Usage examples for complex functions

3. **Apply documentation**
   - If --update, merge with existing documentation
   - Otherwise, add new documentation blocks
   - Preserve existing code structure

### For `api` documentation:

1. **Identify API endpoints**
   - Find route definitions (Express, FastAPI, etc.)
   - Extract HTTP methods, paths, and handlers
   - Identify request/response schemas

2. **Generate API documentation**
   - Create OpenAPI/Swagger-style documentation
   - Include:
     - Endpoint paths and methods
     - Request parameters and body schemas
     - Response schemas and status codes
     - Authentication requirements
     - Example requests and responses

### For `readme` documentation:

1. **Analyze project structure**
   - Read package.json, pyproject.toml, etc.
   - Identify project name, description, dependencies
   - Find existing documentation

2. **Generate README content**
   - Project title and description
   - Installation instructions
   - Usage examples
   - Configuration options
   - API reference (if applicable)
   - Contributing guidelines
   - License information

### For `module` documentation:

1. **Analyze module exports**
   - Identify all public exports
   - Document each exported item
   - Show import examples

2. **Generate module documentation**
   - Module overview
   - Exported functions/classes
   - Usage patterns
   - Dependencies

### For `changelog` documentation:

1. **Analyze changes**
   - Review git history since last release
   - Categorize changes (added, changed, fixed, removed)
   - Identify breaking changes

2. **Generate changelog entry**
   - Follow Keep a Changelog format
   - Group by change type
   - Include issue/PR references

### For `architecture` documentation:

1. **Analyze system structure**
   - Map directory structure
   - Identify major components
   - Trace data flow

2. **Generate architecture documentation**
   - System overview diagram (Mermaid)
   - Component descriptions
   - Data flow documentation
   - Technology stack
</instructions>

---

## Examples

<examples>
### Example 1: Add Inline Documentation
```
/document src/utils/helpers.ts
```
Generates JSDoc comments for all functions in the helpers file.

### Example 2: Generate API Documentation
```
/document src/api/ --type api --output docs/api.md
```
Creates API documentation for all endpoints in the api directory.

### Example 3: Generate Project README
```
/document --type readme
```
Creates or updates the project README.md based on project structure.

### Example 4: Document a Single Function
```
/document src/auth/validate.ts:validateToken
```
Generates documentation for the specific validateToken function.

### Example 5: Generate Changelog Entry
```
/document --type changelog
```
Creates a changelog entry for changes since the last release.

### Example 6: Update Existing Documentation
```
/document src/services/ --update
```
Updates existing documentation without replacing manual additions.
</examples>

---

## Output Examples

<output_examples>
### JSDoc Example:
```typescript
/**
 * Validates a user authentication token.
 *
 * @param {string} token - The JWT token to validate
 * @param {ValidateOptions} [options] - Optional validation configuration
 * @param {boolean} [options.checkExpiry=true] - Whether to check token expiration
 * @returns {Promise<TokenPayload>} The decoded token payload
 * @throws {TokenExpiredError} If the token has expired
 * @throws {InvalidTokenError} If the token is malformed
 *
 * @example
 * const payload = await validateToken('eyJhbGc...');
 * console.log(payload.userId);
 */
async function validateToken(token: string, options?: ValidateOptions): Promise<TokenPayload>
```

### Python Docstring Example:
```python
def validate_token(token: str, check_expiry: bool = True) -> TokenPayload:
    """Validate a user authentication token.

    Args:
        token: The JWT token to validate.
        check_expiry: Whether to check token expiration. Defaults to True.

    Returns:
        TokenPayload: The decoded token payload containing user information.

    Raises:
        TokenExpiredError: If the token has expired.
        InvalidTokenError: If the token is malformed or invalid.

    Example:
        >>> payload = validate_token('eyJhbGc...')
        >>> print(payload.user_id)
    """
```

### README Section Example:
```markdown
## Installation

```bash
npm install my-package
```

## Usage

```typescript
import { MyClass } from 'my-package';

const instance = new MyClass({ option: 'value' });
const result = await instance.process(data);
```
```
</output_examples>

---

## Error Handling

<error_handling>
- **File not found**: "Cannot find file: [path]. Please verify the path is correct."
- **Unsupported language**: "Documentation generation for [language] is not fully supported. Generating generic comments."
- **No exports found**: "No public exports found in [file]. Nothing to document."
- **Output path not writable**: "Cannot write to [path]. Please check permissions or specify a different output path."
- **Conflicting documentation**: "Existing documentation differs significantly. Use --update to merge or remove --update to replace."
- **Invalid target function**: "Function [name] not found in [file]. Available functions: [list]."
- **Large codebase warning**: "Directory contains many files. This may take a while. Consider documenting specific files."
</error_handling>
