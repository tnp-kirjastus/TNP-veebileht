# Task 8 — Customer accounts and customer administration

## Goal

Add customer registration/login and account-linked order history while keeping guest checkout and staff authorisation separate.

## Customer storefront

- Register, verify email, login/logout and reset password
- Profile name, phone and locale
- Verified email-change flow
- Saved delivery addresses
- Session revocation/security controls
- Separate marketing consent preferences
- Order history/detail and reorder
- Data export and deletion request

## Checkout/order linkage

- Prefill signed-in profile/address while allowing per-order edits.
- Link orders to the authenticated user ID server-side.
- Preserve immutable order-time customer/price/address snapshots.
- Keep guest checkout with nullable `customer_id`.
- Never reveal historical orders based only on matching email.
- Use an expiring verified claim flow for guest orders.

## Customer admin

- Search/filter/paginate customers
- Account state, verification, registration/last activity
- Order count/value and order links
- Consent history
- Privacy requests
- Restricted internal support notes
- Resend verification/reset email
- Suspend/reactivate and revoke sessions
- Administrator-only audited merge/claim/privacy actions

Staff never see or set passwords, reset tokens or session tokens. Avoid impersonation; prefer a read-only support view.

## Security

- RLS isolates profiles, addresses, consents and orders by authenticated user.
- Customer authentication never grants `/haldus` access.
- Rate-limit signup/login/reset/claim operations.
- Neutral responses prevent account enumeration.
- Audit customer-service actions without duplicating sensitive data.

## Acceptance criteria

- Customer can manage only their own account/data.
- Guest and signed-in checkout both work.
- Orders link securely and historical order snapshots remain unchanged.
- Email matching alone never grants order access.
- Customer cannot access admin routes/actions.
- Suspend, session revoke, export and deletion-request flows work.

