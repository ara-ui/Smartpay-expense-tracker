# SmartPay Savings — Final Cleanup

This version makes SmartPay the internal virtual payment system and removes the RazorpayX payout feature completely.

## Removed
- RazorpayX payout routes, controllers, services, provider, webhook handling, and payout model
- RazorpayX payout references from transaction history/details
- RazorpayX environment variables
- Obsolete RazorpayX payout documentation and patch manifests

## Kept
- Cashfree checkout for the existing premium-membership flow
- SmartPay demo wallet and internal transfers
- Budget / Spending Guard features
- Weekly and monthly savings calculations
- Savings-based leaderboard and Savings Champion

## SmartPay concept
SmartPay uses virtual/demo balances and `name@smartpay` Payment IDs. It does not connect to real UPI or move real bank money.

## Savings leaderboard
The leaderboard ranks users by money saved against their configured budget for the selected period:

`Savings = Budget Limit - Actual Expenses`

Users can view weekly and monthly savings separately. The Savings Champion is the user with the highest calculated savings for that period.
