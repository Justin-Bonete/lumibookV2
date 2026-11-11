# User acceptance test script (phase 7)
Run on staging with PayMongo TEST mode. Test card/e-wallet details are in PayMongo's testing docs.

## Member journey
1. Register with a new email, a weak password is rejected, a strong one is accepted
2. Verification email arrives; before verifying, Buy and Download are blocked with a clear message; "Resend" works
3. Click the link, you land on the sign-in page with a verified notice
4. Library: search, category chips, locked/unlocked filter, paging, book detail page
5. Free plan: download up to the monthly limit, the next one is refused with a clear message
6. Plans page: prices shown, buy Premium, pay in test mode, return to the site, the plan activates within about a minute, a receipt email arrives
7. Cancel at the payment page: no charge, order stays pending, you can retry
8. Forgot password: email arrives, link works once, old password stops working
9. Phone: every page usable at 375 px wide, no sideways scrolling

## Owner journey
1. Sign in as owner; overview numbers look right
2. Upload a PDF + cover, mark rights cleared, publish, add to a plan collection (cannot exceed the plan limit)
3. Users page: search, filter by plan, open a user, see plan history, downloads, orders
4. Change a user's plan manually; suspend and reactivate a user
5. Orders page: the test purchase shows as paid; "Re-check payment" on a pending order
6. Activity log shows each action above

## Accessibility quick pass
- Keyboard only: skip link, all buttons and forms reachable, visible focus
- Screen reader or browser checker: form fields have labels, errors are announced
- 200% zoom: layout still usable

Record each failure with the page, what you did, and what you expected.
