# Release Process

This document outlines the steps to prepare and release a new version of @mystogab/promise-pool.

## Release Preparation Steps

When preparing for a release, follow these steps:

### 1. Determine Release Type
First, determine if this is:
- A **fix** (patch): Bug fixes, documentation updates, minor improvements
- A **minor** change: New features, backward-compatible enhancements
- A **major** change: Breaking changes, major architectural updates

Ask for clarification if unsure about the nature of changes.

### 2. Update Package Version
Update `package.json` to the appropriate version following semantic versioning:
- Patch version (x.x.1) for fixes
- Minor version (x.1.x) for new features
- Major version (1.x.x) for breaking changes

Example: If current version is `1.2.3` and this is a feature addition, update to `1.3.0`.

### 3. Add CHANGELOG Entry
Add an entry to `CHANGELOG.md` with:
- Version number and date
- List of changes with clear descriptions
- Mark breaking changes with **BREAKING:** prefix

### 4. Update README.md
Update the README.md file to include:
- Latest CHANGELOG entry in the last section
- Any updated documentation or examples reflecting the changes

### 5. Run Tests
Run the test suite to ensure everything works correctly:
```bash
npm run test
```

### 6. Publish
After successful testing, publish to npm:
```bash
npm publish
```

> Note: This step requires proper npm authentication and permissions.