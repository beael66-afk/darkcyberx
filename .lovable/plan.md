
## Analysis

The user is asking: will registration request amounts also be counted in total revenue and persist after deletion?

### Current State:
1. **Renewal requests**: When confirmed via `confirm-renewal` edge function → creates an invoice → revenue persists. ✅
2. **Registration requests**: When approved via `approveRegMutation` in `RenewalOrders.tsx` (lines 312-398) → **NO invoice is created** ❌

The `approveRegMutation` does:
- Creates customer
- Links Telegram
- Updates status to "approved"
- Creates license
- Notifies via bot
- **But never creates an invoice!**

So the answer to the user's question is: **NO**, registration request revenue is NOT currently being saved to invoices. If deleted, the amount is lost.

### Fix Plan:
In `approveRegMutation` inside `src/pages/RenewalOrders.tsx`, after creating the license, add an invoice insert with:
- `customer_id` = customer.id
- `license_id` = licData.id (if license created)
- `amount` = req.amount (from the registration request)
- `status` = "paid"
- `paid_at` = now
- `payment_method` = "vodafone_cash"
- `notes` = `تسجيل جديد - ${req.requested_days} يوم`

Also need to invalidate `renewal-revenue` query after approval so stats update.

Also need to invalidate `renewal-revenue` queryKey in `approveRegMutation.onSuccess`.
