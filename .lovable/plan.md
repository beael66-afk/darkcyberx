

## Plan: Import Data from Export File

The uploaded JSON file contains data from the original project across **10 tables**:

| Table | Records |
|-------|---------|
| products | 1 |
| customers | 14 |
| licenses | 16 |
| devices | ~90 |
| blocked_ips | 4 |
| blocked_hwids | 6 |
| revoked_keys | 3 |
| notification_settings | 1 |
| rustdesk_ids | 4 |
| telegram_links | 14 |

### Approach

Create a backend function `import-data` that:

1. Accepts the full JSON export as the request body
2. Uses the service role key to bypass RLS
3. Inserts data in the correct order (respecting foreign key dependencies):
   - `products` first
   - `customers` second
   - `licenses` third (references customers + products)
   - `devices` fourth (references licenses)
   - Then independent tables: `blocked_ips`, `blocked_hwids`, `revoked_keys`, `notification_settings`, `rustdesk_ids`, `telegram_links`
4. Uses `upsert` with `onConflict: 'id'` to avoid duplicates if run multiple times
5. Returns a summary of how many records were imported per table

### Steps

1. **Create edge function** `supabase/functions/import-data/index.ts` -- handles the bulk import with service role
2. **Add an import button** to the Settings page (or invoke it directly) that sends the JSON data to the function
3. Alternatively, call the function once from the frontend with the uploaded JSON

### Technical Details

- The function will use `supabaseAdmin` (service role) to bypass all RLS
- For `notification_settings`, will use upsert to handle the existing default row
- `user_id` fields on customers will remain `null` (no auth users in new project)
- The `telegram_links` table has a foreign key to `customers`, so customers must be inserted first

