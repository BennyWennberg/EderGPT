# Test

<skill_metadata>
<name>test</name>
<version>1.0.0</version>
<description>Generates or runs tests for code</description>
<author>skill-creator</author>
</skill_metadata>

---

## Description

<description>
This skill helps with testing by either generating new tests for existing code
or running existing tests. It supports multiple testing frameworks and languages,
automatically detecting the project's test configuration. When generating tests,
it creates comprehensive test cases covering normal operation, edge cases, and
error conditions.

Supported operations:
- **generate**: Create new test files for specified code
- **run**: Execute tests and report results
- **coverage**: Run tests with coverage reporting
- **watch**: Run tests in watch mode (if supported)

Test types supported:
- Unit tests
- Integration tests
- Component tests (React, Vue, etc.)
- API tests
- Snapshot tests
</description>

---

## Parameters

<parameters>
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action | string | no | Action to perform: generate, run, coverage, watch (default: run) |
| target | string | no | File/function to test or test file pattern to run |
| framework | string | no | Test framework: jest, vitest, pytest, mocha, etc. (auto-detected) |
| type | string | no | Test type: unit, integration, e2e, component (default: unit) |
| coverage | boolean | no | Include coverage report (default: false for run) |
| verbose | boolean | no | Show verbose output (default: false) |
</parameters>

---

## Usage

<usage>
/test [action] [target] [--framework FRAMEWORK] [--type TYPE] [--coverage] [--verbose]
</usage>

---

## Instructions

<instructions>
When this skill is invoked:

### For `generate` action:

1. **Analyze the target code**
   - Read the file or function to be tested
   - Identify exported functions, classes, and methods
   - Understand input parameters and return types
   - Note dependencies and external calls

2. **Detect testing framework**
   - Check package.json for test dependencies (jest, vitest, mocha, etc.)
   - Check pyproject.toml/setup.py for pytest, unittest
   - Look for existing test files to match patterns
   - Use specified framework if provided

3. **Determine test file location**
   - Follow project conventions (e.g., __tests__/, *.test.ts, *.spec.ts)
   - Place tests near source files or in dedicated test directory
   - Match the source file naming convention

4. **Generate comprehensive tests**
   - Import/require necessary modules and mocks
   - Create describe blocks for each function/class
   - Write tests for:
     - Normal/happy path scenarios
     - Edge cases (empty inputs, boundaries)
     - Error conditions
     - Async behavior (if applicable)
   - Add appropriate assertions
   - Include setup/teardown if needed

5. **Write the test file**
   - Create the test file in the appropriate location
   - Include clear test descriptions
   - Add comments explaining complex test scenarios

### For `run` action:

1. **Detect test runner**
   - Identify the test command from package.json scripts
   - Or use framework-specific command (npx jest, pytest, etc.)

2. **Execute tests**
   - Run specified test file or all tests if no target
   - Capture output and exit code
   - Parse test results

3. **Report results**
   - Show pass/fail counts
   - List failed tests with error messages
   - Show execution time

### For `coverage` action:

1. **Run tests with coverage**
   - Add coverage flags to test command
   - Execute tests

2. **Report coverage**
   - Show coverage percentages by file
   - Highlight uncovered lines
   - Suggest areas needing more tests

### For `watch` action:

1. **Start watch mode**
   - Run tests in watch mode
   - Inform user how to exit
</instructions>

---

## Examples

<examples>
### Example 1: Run All Tests
```
/test
```
Runs the project's test suite using the detected framework.

### Example 2: Generate Tests for File
```
/test generate src/utils/validation.ts
```
Creates a test file for the validation utilities.

### Example 3: Run Specific Test File
```
/test run src/auth/__tests__/login.test.ts
```
Runs only the specified test file.

### Example 4: Run with Coverage
```
/test run --coverage
```
Runs all tests and generates a coverage report.

### Example 5: Generate Integration Tests
```
/test generate src/api/users.ts --type integration
```
Generates integration tests for the users API module.

### Example 6: Watch Mode
```
/test watch
```
Starts tests in watch mode for continuous feedback.

### Example 7: Verbose Output
```
/test run --verbose
```
Runs tests with detailed output showing all test names.
</examples>

---

## Generated Test Example

<generated_test_example>
For a file `src/utils/math.ts`:
```typescript
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

Generated test file `src/utils/__tests__/math.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { add, divide } from '../math';

describe('math utilities', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-1, 1)).toBe(0);
    });

    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });

    it('should handle decimal results', () => {
      expect(divide(5, 2)).toBe(2.5);
    });

    it('should throw error on division by zero', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero');
    });
  });
});
```
</generated_test_example>

---

## Error Handling

<error_handling>
- **No test framework detected**: "No test framework found. Please install a test framework (e.g., npm install -D vitest) or specify one with --framework."
- **Target file not found**: "Source file not found: [path]. Please verify the file exists."
- **Test file already exists**: "Test file already exists at [path]. Use --force to overwrite or manually merge changes."
- **Test execution failed**: Display the error output and suggest common fixes (missing dependencies, configuration issues).
- **Coverage tool not installed**: "Coverage reporting requires additional setup. Run `npm install -D @vitest/coverage-v8` or equivalent for your framework."
- **Invalid test type**: "Unknown test type: [type]. Valid types are: unit, integration, e2e, component."
- **Timeout**: "Tests timed out after [duration]. Consider running a subset of tests or increasing timeout."
</error_handling>
