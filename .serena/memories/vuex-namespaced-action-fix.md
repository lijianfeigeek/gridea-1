## Vuex Namespaced Action Fix

**Issue**: `[vuex] unknown action type: updateApiSettings`

**Root Cause**: The site module is namespaced (`namespaced: true`) but the component was calling the action without the namespace prefix.

**Solution**: Changed the action dispatch call from:
```typescript
this.$store.dispatch('updateApiSettings', settings)
```

To:
```typescript
this.$store.dispatch('site/updateApiSettings', settings)
```

**Additional Improvements**:
- Updated the APIConfig interface to extend IAPISetting for better type safety
- Maintained compatibility with TypeScript 3.2.2

**Files Modified**:
- `src/views/setting/includes/APISetting.vue` - Fixed action dispatch call and improved interface

**Verification**:
- ✅ ESLint passes without errors
- ✅ Application compiles successfully
- ✅ Electron app starts without Vuex action errors
- ✅ API settings component works properly

The Vuex namespaced action issue has been resolved and the API settings functionality is now fully operational.