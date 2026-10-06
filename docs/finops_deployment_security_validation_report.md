# FinOps Cloud Console — Argolis Deployment, Security Audit & Functional Validation Report

## 1. Deployment & Environment (`argolis-finops-hub-14419` • Port `8081`)

| Property | Value | Status |
| :--- | :--- | :--- |
| **Target GCP Project** | `argolis-finops-hub-14419` (`1057167589155`) | ✅ Verified Active |
| **Global External Load Balancer (Cloud Armor Protected)** | `http://136.68.166.131` (`136.68.166.131`) | ✅ **Publicly Accessible (`HTTP 200`) & WAF Enforced (`403` on SQLi/XSS)** |
| **Global Load Balancer HTTPS (`nip.io` Managed SSL)** | `https://finops.136.68.166.131.nip.io` | ✅ Provisioned (`finops-lb-ssl-cert`) |
| **Cloud Armor WAF Security Policy** | `finops-cloud-armor-waf-policy` | ✅ Active (Rule `1000` SQLi `403`, Rule `1100` XSS `403`, Rule `5000` Rate-Limit `100 req/min/IP`, L7 DDoS Defense) |
| **Cloud Run Public Service URL** | `https://finops-cloud-console-pmxvpsd4qa-uc.a.run.app` | ✅ **Publicly Accessible (`HTTP 200`)** (`--no-invoker-iam-check` + `allUsers`) |
| **Regional Cloud Run URL** | `https://finops-cloud-console-1057167589155.us-central1.run.app` | ✅ **Publicly Accessible (`HTTP 200`)** |
| **Cloud Run Active Revision** | `finops-cloud-console-00001-fh7` | ✅ Port `8081` (`container_port = 8081`) |
| **Artifact Registry Image** | `us-central1-docker.pkg.dev/argolis-finops-hub-14419/finops-repo/finops-cloud-console:latest` | ✅ Pushed (`sha256:25f7eed2fa3e...`) |
| **Cloudtop `itianti` Endpoint** | `http://itianti.c.googlers.com:8081` | ✅ Running on Port `8081` |
| **Cloudtop `itijets` Mirror** | `http://itijets.c.googlers.com:8081` | ✅ Running on Port `8081` |
| **Service Account Identity** | `finops-hub-app-sa@argolis-finops-hub-14419.iam.gserviceaccount.com` | ✅ Least-Privilege IAM Bound |

---

## 2. Infrastructure & Codebase Security Audit

### Vulnerabilities Identified & Remediated

| ID | Severity | Vulnerability Found | Remediation Applied | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRITICAL** | **Source Code & Infrastructure Disclosure (CWE-548):** `server.py` inherited from `SimpleHTTPRequestHandler` over the root directory, allowing anyone to download `/server.py`, `/Dockerfile`, `/deploy_to_argolis.sh`, and `/terraform/main.tf`. | Replaced with `BaseHTTPRequestHandler` and an explicit static asset allowlist (`/`, `/index.html`, `/style.css`, `/app.js`). All other file paths return HTTP `404`. | `GET /server.py` → `404`<br>`GET /Dockerfile` → `404`<br>`GET /terraform/main.tf` → `404` |
| **SEC-02** | **HIGH** | **DOM Cross-Site Scripting in AI Chat (CWE-79):** `app.js` injected `data.reply` directly into `.innerHTML` without HTML escaping. | Added `formatSafeMarkdown()` in [`app.js`](file:///usr/local/google/home/imedtra/.gemini/jetski/brain/c55f0db9-3c16-4023-b34a-d7c31c01b502/scratch/finops-cloud-console/app.js#L1237-L1243) which runs `escapeHtml()` prior to rendering Markdown formatting. | Verified XSS payloads are HTML-entity escaped. |
| **SEC-03** | **HIGH** | **Missing HTTP Security Headers & Wildcard CORS:** Missing `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `Permissions-Policy`, and `Cross-Origin-Opener-Policy`, plus wildcard `Access-Control-Allow-Origin: *`. | Added strict CSP, HSTS (`max-age=31536000; includeSubDomains`), `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY`, and removed wildcard CORS in [`server.py`](file:///usr/local/google/home/imedtra/.gemini/jetski/brain/c55f0db9-3c16-4023-b34a-d7c31c01b502/scratch/finops-cloud-console/server.py#L67-L88). | Verified via `curl -sI` response headers. |
| **SEC-04** | **MEDIUM** | **Unbounded POST Payload DoS & Project Misconfiguration:** `server.py` read unbounded `Content-Length` into memory and defaulted to `cloudtop-prod-europe-north`. | Enforced `MAX_BODY_BYTES = 32768` (32 KB limit returning `413`) and pinned `GOOGLE_CLOUD_PROJECT=argolis-finops-hub-14419`. | Verified payload guard and project binding. |
| **SEC-05** | **MEDIUM** | **Container Packaging & Least-Privilege IAM:** `Dockerfile` used `COPY . /app/` (packaging `.tf`, `.sh`, `.log` files) and `terraform/main.tf` lacked `roles/bigquery.dataViewer`. | Hardened [`Dockerfile`](file:///usr/local/google/home/imedtra/.gemini/jetski/brain/c55f0db9-3c16-4023-b34a-d7c31c01b502/scratch/finops-cloud-console/Dockerfile#L18-L25) (`COPY index.html style.css app.js server.py /app/`, `chmod 440/550`, non-root `appuser`) and bound `roles/aiplatform.user`, `roles/bigquery.jobUser`, and `roles/bigquery.dataViewer` to `finops-hub-app-sa`. | Verified container build & IAM policy in `argolis-finops-hub-14419`. |

---

## 3. Vertex AI Integration Verification

* **Root Cause Fixed:** The original `server.py` called `gemini-1.5-flash` on `cloudtop-prod-europe-north` (which returned HTTP `404 Not Found` and only used `gcloud` CLI, which is absent inside Cloud Run's `python:3.11-slim` container).
* **Solution Implemented:**
  1. Upgraded [`server.py`](file:///usr/local/google/home/imedtra/.gemini/jetski/brain/c55f0db9-3c16-4023-b34a-d7c31c01b502/scratch/finops-cloud-console/server.py#L32-L63) to acquire OAuth2 tokens automatically from the **Google Compute Metadata Server** (`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`) on Cloud Run and from `/usr/local/google/home/imedtra/google-cloud-sdk/bin/gcloud` on `itianti.c.googlers.com`.
  2. Connected to **`gemini-2.5-flash`** (`https://us-central1-aiplatform.googleapis.com/v1/projects/argolis-finops-hub-14419/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`), injecting the user's active **BigQuery Export Table**, **Consumption Scope**, and **Selected Projects** into the system prompt.
  3. Verified live HTTP `200 OK` responses from `gemini-2.5-flash` on `argolis-finops-hub-14419` and added a `⚡ Live Vertex AI (gemini-2.5-flash • argolis-finops-hub-14419)` verification pill to chat responses.

---

## 4. Feature & UI Validation Summary

### A. BigQuery Billing Export Selection
* Provisioned real BigQuery dataset **`argolis-finops-hub-14419:finops_billing_analytics`** with three export tables:
  1. `gcp_billing_export_v1` (Standard Billing Export)
  2. `gcp_billing_export_resource_v1` (Detailed Resource-Level Export)
  3. `gcp_billing_export_pricing_v1` (Pricing & CUD Catalog Export)
* Wired `#bqExportTableSelect` to query `/api/bq/query` and dynamically update KPIs, Service Cost Breakdown rows, active dataset indicators, and BigQuery SQL Studio queries.
* Added **`#uploadBqExportBtn` (`Select BQ File`)** allowing users to load custom `.csv` or `.json` BigQuery export files directly into the dashboard.

### B. Granular Consumption Scoping (`Single Project` / `Multiple Selected Projects` / `Entire Organization`)
* **`single` (Single Project):** Scopes KPIs, charts, Cost Breakdown table, and BigQuery SQL `WHERE project.id = '...'` to any single selected project (`argolis-finops-hub-14419`, `htr-prod-service`, `htr-k8s-cluster`, `htr-data-warehouse`, `htr-analytics-prod`).
* **`multi` (Multiple Selected Projects):** Added the interactive **Granular Consumption Scope Bar (`#multiProjectSelectorBar`)** with individual project checkboxes (`.proj-scope-cb`) and `Select All` button so users can pick any subset of multiple projects (`2/5`, `3/5`, etc.) and see real-time scoped spend and `WHERE project.id IN (...)` SQL generation.
* **`org` (Entire Organization):** Aggregates resource consumption across the full organization (`org-argolis-107365563435`, 45+ projects).

### C. Interactive UI Elements & Buttons Tested
All previously unwired buttons were identified and connected in [`app.js`](file:///usr/local/google/home/imedtra/.gemini/jetski/brain/c55f0db9-3c16-4023-b34a-d7c31c01b502/scratch/finops-cloud-console/app.js#L1297-L1384):
* Top Header: `#sidebarToggleBtn`, `#projectSelectorBtn`, `#globalSearchInput` (`/` shortcut + Enter search), `#btnWhiteView` / `#btnNightView`, `#topGeminiBtn`, `#notificationsBtn`, `#helpDocsBtn`, `#userProfileBtn`.
* Toolbar & Scoping: `#scopeSelect`, `#bqExportTableSelect`, `#uploadBqExportBtn`, `#dateRangeSelect`, `#envFilterSelect`, `#projectFilterSelect`, `.proj-scope-cb` checkboxes, `#selectAllProjectsBtn`, `#exportReportBtn`, `#openGeminiActionBtn`.
* View Actions: `#toggleStackedViewBtn`, `.btn-apply-rec` & `UNDO` snackbar, `.btn-copy-cmd`, `.category-chip` filters, `#recStatusFilter`, `.btn-inspect-service`, `#btnCreateBudget`, `#sqlPresetSelect`, `#runSqlQueryBtn`, `#copySqlQueryBtn`, `#downloadQueryResultsBtn`, `.quick-chip-btn`, `#geminiSendBtn`, `#saveSettingsBtn`, `#resetDefaultsBtn`.
