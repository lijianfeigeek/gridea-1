## Vue Component Integration Fix

**Issue**: "[Vue warn]: Unknown custom element: <api-setting> - did you register the component correctly?"

**Root Cause**: The APISetting component was not properly registered in the Vue component system.

**Solution Implemented**:
1. **Removed name property** from @Component decorator in APISetting.vue (working components don't use name property)
2. **Added global component registration** in Index.vue: `Vue.component('api-setting', APISetting)`
3. **Ensured proper component import** and template integration

**Files Modified**:
- `src/views/setting/Index.vue` - Added API settings tab, import, and global registration
- `src/views/setting/includes/APISetting.vue` - Removed name property from @Component decorator

**Result**: Application starts successfully without Vue component registration errors. API settings are now accessible in the GUI.

**Verification**: 
- ESLint passes without errors
- Application startup successful
- API settings tab integrated into main settings page