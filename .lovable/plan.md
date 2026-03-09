

## Issue: Admin Role Check Failing (406 Error)

The admin role **does exist** in the database for user `2c953f5f-e300-4dc2-8dbb-d174c4339ce2`. The RLS policies are permissive and should work correctly.

The 406 error (`Cannot coerce the result to a single JSON object`) from the `user_roles` query means the query returned 0 rows with `.single()`. This is likely a **session/token caching issue** - the JWT token was issued before the admin role was added, and the `has_role` SECURITY DEFINER function should bypass RLS, but the "Admins can manage roles" policy checks `has_role(auth.uid(), 'admin')` which creates a **recursive lookup** that the SECURITY DEFINER function handles. However, the "Users view own roles" permissive policy should independently allow access.

### Root Cause Investigation

Looking more carefully: the `checkAdminRole` function in `DashboardLayout.tsx` queries with `.eq("role", "admin").single()`. If RLS is blocking the read despite the permissive policy, the issue could be that the policies are actually **RESTRICTIVE** in the migration but showing as permissive in pg_policy. Let me re-examine...

Actually, from the schema context: all policies say `Permissive: No` — meaning they ARE **restrictive**. The `pg_policy` query showed `polpermissive: true` which seems contradictory. But the useful-context section clearly states `Permissive: No` for both policies.

If both policies are **RESTRICTIVE**, they are AND'd together. This means:
- `has_role(auth.uid(), 'admin')` AND `user_id = auth.uid()` must BOTH be true for SELECT
- But `has_role` queries `user_roles` itself, creating a circular dependency

### Fix Plan

1. **Drop the restrictive policies on `user_roles`** and recreate them as **PERMISSIVE**:
   - Permissive "Users view own roles" policy for SELECT: `user_id = auth.uid()`
   - Permissive "Admins can manage roles" policy for ALL: `has_role(auth.uid(), 'admin')`

This way the policies are OR'd: a user can read their own role OR an admin can manage all roles.

### Steps

1. Run a migration to drop and recreate the two `user_roles` RLS policies as PERMISSIVE
2. User refreshes the page and the dashboard should load with all imported data

