---
name: Azure Infra Control Center
description: Owner-only Azure admin dashboard — service-principal creds gotchas and the RBAC roles its data planes require.
---

# Azure Infrastructure Admin Control Center

Owner-only Express proxy (server/services/azure-infra.ts + server/routes/azure-infra-routes.ts) to Azure REST APIs with a dark vanilla-HTML dashboard at `/admin/infra` (gated by isAuthenticated + owner email).

## Service-principal credential gotchas (verifying live)
- **"AADSTS90002 Tenant not found"** = the tenant GUID is wrong/typo'd, not an RBAC issue. Re-confirm the Directory (tenant) ID from the app registration Overview.
- **"AADSTS7000215 Invalid client secret"** = the stored value is the **Secret ID** (a 36-char GUID), not the secret **Value**. The Value is ~40 chars with symbols and is shown only once at creation; if lost, create a new client secret. Quick check without printing: length 36 + GUID regex match ⇒ wrong (it's the ID).
- Verify creds out-of-band with a tiny `node` script using client-credentials flow (never print token/secret). The owner gate makes curl-testing the real endpoints impractical.

## RBAC the SP needs (token acquired but 403/404 on data = missing roles, NOT code)
- App Service **control** (start/stop/restart/deepsleep/slotswap) + metrics ⇒ **Contributor** on the resource group.
- Cost reads ⇒ **Cost Management Reader** at **subscription** scope; the "set budget" write needs **Cost Management Contributor**.
- Activity logs (Log Analytics KQL) ⇒ **Log Analytics Reader** on the workspace.
- App Insights KQL ⇒ **Monitoring Reader** (subscription or the AI component).
- **Why:** a 403 = authenticated but unauthorized; a 404 from api.loganalytics.io / api.applicationinsights.io usually also means no access (Azure hides existence) — grant the role before suspecting a wrong workspace/app ID.

## Prod note
Replit secrets are dev-only. The published Azure App Service needs all 8 AZURE_* vars set in its own config, and the SP needs the same role assignments, or prod 403s while dev works.
