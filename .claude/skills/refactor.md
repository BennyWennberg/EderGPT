# Refactor

<skill_metadata>
<name>refactor</name>
<version>1.0.0</version>
<description>Refactors code for better structure and maintainability</description>
<author>skill-creator</author>
</skill_metadata>

---

## Description

<description>
This skill refactors code to improve its structure, readability, and maintainability
without changing its external behavior. It identifies code smells, applies proven
refactoring patterns, and ensures the refactored code maintains the same functionality.
The skill supports various refactoring operations from simple renames to complex
architectural changes.

Common refactoring operations:
- **extract**: Extract function, method, variable, or class
- **rename**: Rename identifiers with proper reference updates
- **move**: Move code to different files or modules
- **inline**: Inline functions or variables
- **simplify**: Reduce complexity and improve readability
- **modernize**: Update to modern language features
- **split**: Split large files or functions
- **consolidate**: Merge duplicate or similar code
</description>

---

## Parameters

<parameters>
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | no | File, function, or code pattern to refactor (default: current file) |
| operation | string | no | Refactoring operation: extract, rename, move, inline, simplify, modernize, split, consolidate (default: simplify) |
| name | string | no | New name for rename/extract operations |
| destination | string | no | Target location for move/extract operations |
| dry-run | boolean | no | Show proposed changes without applying (default: false) |
| scope | string | no | Scope of changes: file, module, project (default: file) |
</parameters>

---

## Usage

<usage>
/refactor [target] [--operation OP] [--name NAME] [--destination PATH] [--dry-run] [--scope SCOPE]
</usage>

---

## Instructions

<instructions>
When this skill is invoked:

### General workflow:

1. **Analyze the target code**
   - Read the file or code section to refactor
   - Understand the code's purpose and behavior
   - Identify dependencies and usages
   - Run existing tests if available to establish baseline

2. **Identify refactoring opportunities** (for simplify operation)
   - Code smells:
     - Long functions (>30 lines)
     - Deep nesting (>3 levels)
     - Long parameter lists (>4 parameters)
     - Duplicate code
     - Dead code
     - Magic numbers/strings
   - Complexity issues:
     - High cyclomatic complexity
     - Unclear variable names
     - Missing abstractions
   - Modernization opportunities:
     - Deprecated patterns
     - Old syntax that has better alternatives

3. **Plan the refactoring**
   - Determine the specific changes needed
   - Identify all affected files
   - Plan the order of changes
   - Consider backward compatibility

4. **Apply changes** (unless --dry-run)
   - Make changes incrementally
   - Update all references
   - Maintain imports/exports
   - Preserve formatting conventions

5. **Verify the refactoring**
   - Ensure no syntax errors
   - Check that tests still pass
   - Verify no functionality changed

### For `extract` operation:

1. Identify the code to extract
2. Determine appropriate name and location
3. Create new function/class/variable
4. Replace original code with call/reference
5. Update imports if moved to different file

### For `rename` operation:

1. Find all usages of the identifier
2. Verify no naming conflicts
3. Update all references across the scope
4. Update imports/exports
5. Update documentation references

### For `move` operation:

1. Identify code to move
2. Verify destination location
3. Move code with all dependencies
4. Update all imports/references
5. Clean up source file

### For `inline` operation:

1. Find the function/variable definition
2. Verify it's safe to inline (no side effects concerns)
3. Replace all usages with the actual code
4. Remove the original definition
5. Clean up unused imports

### For `simplify` operation:

1. Analyze code complexity
2. Apply simplification patterns:
   - Early returns to reduce nesting
   - Guard clauses
   - Descriptive variable names
   - Breaking up long functions
   - Removing redundant code

### For `modernize` operation:

1. Identify outdated patterns
2. Apply modern equivalents:
   - var -> const/let
   - callbacks -> async/await
   - prototype -> class
   - string concatenation -> template literals
   - lodash utilities -> native methods (where applicable)

### For `split` operation:

1. Analyze file/function size and concerns
2. Identify logical groupings
3. Create new files/functions
4. Move code to appropriate locations
5. Set up exports and imports

### For `consolidate` operation:

1. Find duplicate or similar code
2. Identify common patterns
3. Create shared abstraction
4. Replace duplicates with shared code
5. Ensure all use cases are covered
</instructions>

---

## Examples

<examples>
### Example 1: Simplify a File
```
/refactor src/utils/helpers.ts
```
Analyzes the file and applies simplification improvements.

### Example 2: Extract Function
```
/refactor src/services/user.ts:processUser --operation extract --name validateUserData
```
Extracts the validation logic into a separate function.

### Example 3: Rename with Project-wide Update
```
/refactor getUserById --operation rename --name findUserById --scope project
```
Renames the function and updates all references across the project.

### Example 4: Move Function to New File
```
/refactor src/utils/helpers.ts:formatDate --operation move --destination src/utils/date.ts
```
Moves the formatDate function to a dedicated date utilities file.

### Example 5: Dry Run
```
/refactor src/legacy/old-module.ts --operation modernize --dry-run
```
Shows what modernization changes would be made without applying them.

### Example 6: Split Large File
```
/refactor src/services/mega-service.ts --operation split
```
Splits a large service file into smaller, focused modules.

### Example 7: Inline Variable
```
/refactor tempResult --operation inline
```
Inlines a temporary variable that's only used once.

### Example 8: Consolidate Duplicates
```
/refactor src/api/ --operation consolidate
```
Finds and consolidates duplicate code in the API directory.
</examples>

---

## Refactoring Patterns

<refactoring_patterns>
### Extract Function
Before:
```typescript
function processOrder(order: Order) {
  // Validate order
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!order.customerId) {
    throw new Error('Order must have customer');
  }

  // Process payment
  const total = order.items.reduce((sum, item) => sum + item.price, 0);
  // ... more code
}
```

After:
```typescript
function validateOrder(order: Order): void {
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!order.customerId) {
    throw new Error('Order must have customer');
  }
}

function processOrder(order: Order) {
  validateOrder(order);

  const total = order.items.reduce((sum, item) => sum + item.price, 0);
  // ... more code
}
```

### Simplify Conditionals
Before:
```typescript
function getDiscount(user: User) {
  if (user.isPremium) {
    if (user.yearsActive > 5) {
      return 0.25;
    } else {
      return 0.15;
    }
  } else {
    if (user.yearsActive > 5) {
      return 0.10;
    } else {
      return 0;
    }
  }
}
```

After:
```typescript
function getDiscount(user: User): number {
  const isLongTime = user.yearsActive > 5;

  if (user.isPremium && isLongTime) return 0.25;
  if (user.isPremium) return 0.15;
  if (isLongTime) return 0.10;
  return 0;
}
```

### Modernize Syntax
Before:
```javascript
var self = this;
getData(function(err, data) {
  if (err) {
    console.error(err);
    return;
  }
  self.data = data;
  self.render();
});
```

After:
```javascript
try {
  this.data = await getData();
  this.render();
} catch (err) {
  console.error(err);
}
```
</refactoring_patterns>

---

## Error Handling

<error_handling>
- **File not found**: "Cannot find file: [path]. Please verify the path is correct."
- **Identifier not found**: "Cannot find identifier '[name]' in scope. Check spelling and scope."
- **Name collision**: "Name '[name]' already exists in target scope. Choose a different name."
- **Circular dependency**: "Refactoring would create circular dependency between [file1] and [file2]."
- **Tests failing**: "Warning: Tests are failing after refactoring. Review changes or rollback with git checkout."
- **Breaking change detected**: "This refactoring may break external consumers. Consider adding deprecation notice first."
- **Unsafe inline**: "Cannot safely inline '[name]' due to side effects or multiple usages with different contexts."
- **Parse error**: "Cannot parse [file]. Please fix syntax errors before refactoring."
- **Scope too large**: "Refactoring scope 'project' affects [n] files. Consider using --dry-run first to review changes."
</error_handling>
