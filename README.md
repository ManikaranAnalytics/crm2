# Next CRM Portal (Next.js + Postgres)

A premium Customer Relationship Management (CRM) portal built with Next.js, PostgreSQL, and Highcharts. It provides a secure, modern workspace for managing query tickets, client relationships, and communication threads.

---

## Core Features

- **Interactive Dashboard**: Premium data visualizations built on Highcharts including Columns, Area, and Line charts showing query volume trends, solved tickets, and team queues.
- **Secure Authentication**: Cryptographically signed JSON Web Tokens (JWT) stored in secure, HttpOnly session cookies (`crm_session_token`) to safeguard user accounts.
- **Query Management**: Log new queries with Outlook `.msg` / `.eml` email attachments, status badges, automated assignment routing, and query tracking codes.
- **Outlook-Style Email Preview**: Unified in-app viewer for `.msg` and `.eml` files with HTML rendering (tables, images, signatures), CID inline images, sanitized HTML, and nested attachment downloads.
- **Outlook EML Export**: Seamlessly download standard RFC-822 `.eml` mail draft files client-side, loaded with recipient details, subjects, bodies, and files for immediate draft editing in Microsoft Outlook.
- **Secure Attachment Subdirectories**: Uploaded files are segmented into query-specific directories (`uploads_secure/query_<id>/`) and dynamically streamed via Catch-All routing endpoints to prevent path traversal attacks.
- **Validation Guards**: 
  - Restricts file attachment size to `< 20MB` on both Query Creation and Replies.
  - Validates client capacity requirements (`capacityMw` must be positive float values).
  - Draft preservation prompts (`beforeunload` and Next.js page transition blocks) that warn users of unsaved replies.
- **Admin Console**: Fully tabbed dashboard interface to manage users, system roles (`ADMIN`, `MANAGER`, `KAM`), client accounts, and PSS configurations.
- **Performance Database Indexes**: Deployed index structures (`idx_attachments_owner`) on attachment records to ensure snappy query replies load-times.

---

## Technology Stack

* **Frontend**: Next.js, React, Tailwind CSS, Highcharts, Lucide-style SVGs.
* **Backend**: Next.js API Routes, Node.js email parsing (`@kenjiuno/msgreader`, `mailparser`, `rtf-stream-parser`, `iconv-lite`, `sanitize-html`).
* **Database**: PostgreSQL (driver: `pg`).
* **Environment**: Docker & Docker Compose.
* **Supported PSS Technologies**: Solar, Wind, Solar-Wind Hybrid, Solar-Wind-Battery Hybrid, Solar-Battery Hybrid, Wind-Battery Hybrid.

---

## Getting Started

### 1. Environment Configuration
Create a `.env.local` file in the root of the project with your connection details:
```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/crm_portal
```

### 2. Run Database Seeding
To seed test users and configure default roles:
```bash
npm run seed:users
```
Test users configured:
* **ADMIN**: `admin@demo.com` (Password: `changeme`)
* **MANAGER**: `manager@demo.com` (Password: `changeme`)
* **KAM**: `kam@demo.com` (Password: `changeme`)

### 3. Local Development Server
Start the development server:
```bash
npm run dev:local
```

### 4. Running with Docker Compose
To build and deploy both Next.js and PostgreSQL in connected containers:
```bash
docker-compose up --build -d
```
* **PostgreSQL** runs on port `5432` internally.
* **Web Portal** runs on port `3000`.

---

## Developers

- **Lead Developer**: Mehul Rastogi
- **Code Review & Improvement for Prod.**: Sonu Bhagat
