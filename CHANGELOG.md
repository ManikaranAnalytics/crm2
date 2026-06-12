# Changelog — June 12, 2026

## 1. Polished Dashboard Icons & Shadows
* **Metric Cards Refresh**: Swapped out card icons inside [dashboard.tsx](file:///f:/CRM/crm/src/pages/dashboard.tsx) with Lucide-style vector SVGs:
  * **Total Queries**: Database Cylinder.
  * **Open Queries**: Alert Circle.
  * **In Progress**: Static Clock/Timer (removes the spinning/rotating arrow animation).
  * **Active Queue**: Users Group.
  * **This Month**: Calendar.
* **Softer Shadows**: 
  * Lightened the metrics cards' shadow to a subtle `shadow-[0_1px_2px_rgba(0,0,0,0.015)]`.
  * Softened the charts' container shadows from default `shadow-sm hover:shadow-md` to `shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]`.

## 2. Project-wide Emoji Removal
* **SVG Icons Migration**: Removed raw emojis from [reply.tsx](file:///f:/CRM/crm/src/pages/queries/reply.tsx) and [QueryConversationModal.tsx](file:///f:/CRM/crm/src/components/QueryConversationModal.tsx), replacing them with SVG components:
  * `📎` (Paperclip) → `<IconPaperclip />`
  * `✉️` (Mail/Envelope) → `<IconMail />`
  * `📥` (Download Tray) → `<IconDownload />`
  * `✕` (Close Cross Character) → `<IconClose />`
* **TypeScript Warning Fix**: Cast Highcharts linearGradient stop configurations as `any` in [DashboardChart.tsx](file:///f:/CRM/crm/src/components/DashboardChart.tsx) to resolve compiler warnings.

## 3. Structured Subdirectory Storage for Secure Attachments
* **Query Subdirectories**: 
  * Configured original query `.msg` attachments to be written to nested subfolders under [index.ts](file:///f:/CRM/crm/src/pages/api/queries/index.ts): `uploads_secure/query_${created.id}/` (DB link: `/api/attachments/query_${created.id}/${filename}`).
  * Configured query response attachments to be written under [replies.ts](file:///f:/CRM/crm/src/pages/api/queries/replies.ts): `uploads_secure/query_${qId}/` (DB link: `/api/attachments/query_${qId}/${filename}`).
* **Catch-All Dynamic Router**: 
  * Upgraded file serving by deleting `[filename].ts` and creating [[...filename].ts](file:///f:/CRM/crm/src/pages/api/attachments/[...filename].ts). Resolves subfolders dynamically while sanitizing path segments to prevent directory traversal.
* **Lookups Sync**:
  * Updated [parse-msg.ts](file:///f:/CRM/crm/src/pages/api/attachments/parse-msg.ts) and [reply.tsx](file:///f:/CRM/crm/src/pages/queries/reply.tsx) path resolutions to process folder-based lookups.

## 4. Client-side Outlook Export (.eml)
* **EML Draft Generation**: Added an **Export Draft (.eml)** button next to the compose editor on [reply.tsx](file:///f:/CRM/crm/src/pages/queries/reply.tsx) and [QueryConversationModal.tsx](file:///f:/CRM/crm/src/components/QueryConversationModal.tsx).
* **MIME Formatting**: Generates a standard RFC-822 formatted `.eml` mail draft using client-side base64 attachment chunks. Opening the file launches Outlook directly in edit/compose mode with prefilled recipients, subjects, body, and files.

## 5. Fixed Page-Refresh Redirect Bug
* **Introduced Initialization Flag**: Added an `initialized` state flag to `AuthContext` inside [\_app.tsx](file:///f:/CRM/crm/src/pages/_app.tsx) that switches to `true` only after the client has restored the session from storage or cookies.
* **Session Guard Refactoring**:
  * Configured [Layout.tsx](file:///f:/CRM/crm/src/components/Layout.tsx) to render a clean spinner overlay until initialization completes, bypassing premature `/login` redirects.
  * Updated [login.tsx](file:///f:/CRM/crm/src/pages/login.tsx) to handle dashboard auto-routing via context state, avoiding separate cookie check loops.

## 6. Cryptographically Secured Authentication (JWT)
* **JWT signing on Login**: Refactored the login endpoint [login.ts](file:///f:/CRM/crm/src/pages/api/auth/login.ts) to sign a cryptographic JSON Web Token (JWT) with user session payloads.
* **HttpOnly Session Cookies**: Set the signed token inside a secure, client-hidden `HttpOnly` cookie (`crm_session_token`) to prevent cross-site scripting (XSS) spoofing.
* **Cryptographic Verification**: Configured [session.ts](file:///f:/CRM/crm/src/lib/auth/session.ts) to read the cookie and verify the JWT signature (`jwt.verify`). Bypasses raw `x-actor-id` lookup hacks in production while maintaining a safe fallback only in development environments.
* **Secure Session Terminate**: Added an API route [logout.ts](file:///f:/CRM/crm/src/pages/api/auth/logout.ts) that clears the session cookie on log out.

## 7. Quality Manager / Tester Security, Validation, and Performance Improvements
* **File Size Validation**: Enforced a strict 20MB client-side limit for attachments on both the query creation page [new.tsx](file:///f:/CRM/crm/src/pages/queries/new.tsx) and query response page [reply.tsx](file:///f:/CRM/crm/src/pages/queries/reply.tsx).
* **Positive Capacity Validation**: Added numeric validation to check that the `capacityMw` field on [new.tsx](file:///f:/CRM/crm/src/pages/queries/new.tsx) is a positive float (> 0) before form submission is permitted.
* **Draft Preservation Alert**: Implemented a draft loss warning modal inside [reply.tsx](file:///f:/CRM/crm/src/pages/queries/reply.tsx) via `beforeunload` event listener and Next.js `routeChangeStart` handler, alerting users of unsaved text entries before leaving or refreshing the page.
* **Query Lookup Database Indexing**: Added a database index `idx_attachments_owner` on `attachments(owner_type, owner_id)` in [schema.sql](file:///f:/CRM/crm/db/schema.sql) and executed it on the local Postgres instance, optimizing attachment query fetch performance.

