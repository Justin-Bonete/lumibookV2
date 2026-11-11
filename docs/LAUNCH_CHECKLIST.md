# Launch checklist (phase 8)

## Business decisions (owner)
- [ ] Final plan prices set (Plan collections page → Price) and shown correctly on the Plans page
- [ ] Free-plan limits confirmed (5 titles, 3 downloads/month are only proposed)
- [ ] Upgrade rule confirmed (currently earlier downloads still count toward a higher plan's limit)
- [ ] Refund and chargeback policy decided and written into the Refund page
- [ ] Business name, address and support/privacy/copyright contacts filled into Terms, Privacy and Refunds
- [ ] Lawyer has reviewed Terms, Privacy and Refunds; ask about Data Privacy Act obligations and tax (VAT/BIR) on digital sales
- [ ] LUMIBOOK name checked for trademark conflicts

## Content
- [ ] Every published title is rights-cleared (you hold or have licensed distribution rights); proof stored
- [ ] Catalogue has enough titles per plan to honour the promised limits (Premium 20, Premium Plus 58)

## Payments (PayMongo)
- [ ] Account verified (KYC) and live mode approved
- [ ] LIVE keys and a separate LIVE webhook endpoint configured; secrets rotated after any exposure
- [ ] One real low-value purchase made and refunded to confirm the whole flow
- [ ] Payout bank details confirmed

## Email
- [ ] Sending domain has SPF, DKIM and DMARC; verification, reset and receipt emails land in the inbox (not spam)

## Infrastructure
- [ ] DEPLOY.md followed on production; HTTPS grade A; `/api/health` monitored
- [ ] Queue worker and scheduler running (`docker compose ps`)
- [ ] Nightly backups running, copied off-server, and a **restore tested**
- [ ] Error alerting set up (Sentry or log alerts) and someone is on the hook for it

## Go-live day
- [ ] Final `php artisan test`, `composer audit`, `npm audit`
- [ ] SECURITY_CHECKLIST and UAT_CHECKLIST fully ticked
- [ ] Rollback plan agreed (previous git tag + latest backup)
- [ ] Announce; watch the Orders page, logs and uptime monitor closely for the first 48 hours
