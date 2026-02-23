### **v3.1.0** | 2026-02-20
- **Added**: Support for `timeout` parameter to limit individual task execution time
- **Added**: `TIMEOUT_SIGNAL` export to identify timeout-related failures.
- **Fixed**: Package description for improved readability

### **v3.0.0** | 2026-02-18
- **BREAKING:** `promisePool` is now safe by default - never throws, all errors returned in result object
- **BREAKING:** Renamed `iteratorFn` parameter to `process` for better clarity and intent
- **BREAKING:** Renamed `errorHandler` parameter to `onError` to follow modern event-handler conventions
- Validation errors are now gracefully returned in the `errors` array instead of throwing
- Simplified API - removed distinction between throwing and safe variants
- Better error handling for all error types (validation and processing)
- Added comprehensive JSDoc documentation for IDE autocomplete and hover tooltips

### **v2.0.0** | 2026-02-13
- **BREAKING:** Changed API to use named parameters instead of positional arguments
- Updated `promisePool()` to accept a single options object with `input`, `iteratorFn`, `concurrency`, and `errorHandler` properties
- Improved type safety and code clarity with explicit parameter names
- Updated all documentation examples and API reference
- Updated comprehensive test suite to match new API

### **v1.1.2** | 2026-02-03
- Added GitHub link reference
- Fixed documentation badges
- Modified changelog style
- Small typo fix

### **v1.1.0** | 2026-02-02
- Added input validation function `_validateInput` to ensure all parameters are correct
- Added needed unit tests
- Added comprehensive test suite for parameter validation
- Added `Returns` section to API Reference documentation

### **v1.0.1** | 2026-01-31
- Added project keywords

### **v1.0.0** | 2026-01-31
- Initial release
- Core promise pool functionality with dynamic worker queue
- Support for Iterable and AsyncIterable inputs
- POOL_STOP_SIGNAL for graceful termination
- Dual ESM/CommonJS build support
- Zero dependencies
