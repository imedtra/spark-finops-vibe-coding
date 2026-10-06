# 🚀 SPARK FinOps Cloud Console & Antigravity Vibe Coding Workshop

> **Production-Grade Multi-Cloud FinOps Web Application (FOCUS Spec Billing Telemetry, BigQuery Export Explorer, Anomaly Detection Radar, CUD & Compute Rightsizing Simulator, and Live Vertex AI `gemini-2.5-flash` FinOps Copilot) + 3-Hour Antigravity AI Vibe Coding Master Workshop.**

Built for **Google Cloud EMEA Customer Engineering (`@imedtra`)**, demonstrating how FinOps practitioners and Cloud Architects can rapidly build, audit, and deploy an enterprise-grade FinOps Cockpit using **Antigravity Autonomous Agentic Loops** and secure it on **Google Cloud Run + Global External HTTPS Load Balancer + Cloud Armor WAF**.

---

## 🌐 Live Production Endpoints (`argolis-finops-hub-14419` • Port `8081`)

| Endpoint / Resource | URL / Identifier | Status |
| :--- | :--- | :--- |
| **Global External HTTPS Load Balancer (`nip.io`)** | [`https://finops.136.68.166.131.nip.io`](https://finops.136.68.166.131.nip.io) (`http://136.68.166.131`) | 🟢 **Active & Cloud Armor WAF Protected** |
| **Cloud Run Public Service (`us-central1`)** | [`https://finops-cloud-console-pmxvpsd4qa-uc.a.run.app`](https://finops-cloud-console-pmxvpsd4qa-uc.a.run.app) | 🟢 **Active (`HTTP 200`, Port `8081`)** |
| **Vertex AI FinOps Copilot Engine** | `gemini-2.5-flash` (`argolis-finops-hub-14419` • Keyless ADC Metadata Token) | 🟢 **Live BigQuery & Cost Context Grounding** |
| **BigQuery Billing Analytics Dataset** | `argolis-finops-hub-14419:finops_billing_analytics` (`gcp_billing_export_v1`, `resource_v1`, `pricing_v1`) | 🟢 **Live SQL Studio & Export Switcher** |

---

## 🏛️ Zero-Trust Cloud Run + Cloud Armor WAF Architecture & Google AI Ecosystem

### 1. Secure Production Deployment Topology (`argolis-finops-hub-14419`)
![Secure Argolis Cloud Run + Cloud Armor + Global HTTPS Load Balancer Architecture](docs/assets/deploy_arch_slide.png)

### 2. Antigravity Engine vs. Antigravity IDE & Google AI Ecosystem
![Antigravity Engine vs Antigravity IDE](docs/assets/eco_slide_05.png)

### 3. 3-Presenter Animated Cartoon Avatar Video Preview (`google_ai_antigravity_avatar_animated.mp4`)
| **Part 1 (`00:00–01:04`): Imed — AI Solutions Lead** | **Part 2 (`01:04–01:56`): Colleague #1 — AI & FinOps Specialist** | **Part 3 (`01:56–02:21`): Colleague #2 — Cloud Security Architect** |
| :---: | :---: | :---: |
| ![Part 1 — Imed](docs/assets/qa_part1_imed.jpg) | ![Part 2 — Colleague 1](docs/assets/qa_part2_colleague1.jpg) | ![Part 3 — Colleague 2](docs/assets/qa_part3_colleague2.jpg) |

---

## 📐 End-to-End 5-Layer FinOps Cloud Console Architecture

```mermaid
flowchart TD
  subgraph Layer1 ["1. Multi-Cloud Billing & FOCUS Telemetry Sources"]
    UserBrowser["FinOps Practitioner / Executive Browser"]
    BQExports["BigQuery Billing Exports (Standard v1, Resource v1, Pricing v1)"]
    CustomUpload["Custom CSV / JSON Billing Export Uploader"]
  end

  subgraph Layer2 ["2. Edge Security & Global Load Balancing (argolis-finops-hub-14419)"]
    GLB["Global External Application Load Balancer (136.68.166.131)"]
    SSLCert["Google-Managed SSL Certificate (finops.136.68.166.131.nip.io)"]
    CloudArmor["Cloud Armor L7 WAF Policy (SQLi 403, XSS 403, Rate Limit 100 req/min/IP)"]
    SNEG["Serverless NEG (us-central1 -> Port 8081)"]
  end

  subgraph Layer3 ["3. Hardened Cloud Run Runtime (finops-cloud-console • Port 8081)"]
    SecServer["Hardened Python HTTP Server (server.py — Allowlist, CSP, HSTS, 32KB Cap)"]
    CockpitUI["Executive FinOps Cockpit (White/Night Theme, Scope Bar: Single/Multi/Org)"]
    AnomalyRadar["Heuristic Anomaly Radar (>30% 7-Day Median Spike Detector)"]
    Rightsizing["Interactive Compute & CUD Rightsizing Simulator + Undo Stack"]
    SQLStudio["Interactive BigQuery FinOps SQL Studio & CSV/PDF Report Exporter"]
  end

  subgraph Layer4 ["4. Keyless Vertex AI & BigQuery Analytics Engine"]
    ADC["Cloud Run Service Account (finops-hub-app-sa — Keyless Metadata OAuth2)"]
    Gemini["Vertex AI Gemini 2.5 Flash (Natural Language FinOps Query & Recommendations)"]
    BQEngine["BigQuery REST Job Engine (finops_billing_analytics Dataset)"]
  end

  UserBrowser -->|"HTTPS TLS 1.3"| GLB
  CustomUpload -->|"Client/API Ingest"| GLB
  GLB --- SSLCert
  GLB --- CloudArmor
  GLB --> SNEG
  SNEG --> SecServer
  SecServer --> CockpitUI
  CockpitUI --> AnomalyRadar
  CockpitUI --> Rightsizing
  CockpitUI --> SQLStudio
  SecServer -->|"Keyless ADC Token"| ADC
  ADC -->|"POST :generateContent"| Gemini
  ADC -->|"POST /bigquery/v2/jobs"| BQEngine
  BQExports --> BQEngine
```

---

## 📚 Workshop Playbook, Decks & Documentation (`docs/`)

* **[`docs/vibe_coding_finops_workshop_playbook.md`](docs/vibe_coding_finops_workshop_playbook.md)** — Complete 3-Hour (4-Sprint) Antigravity Vibe Coding Master Workshop Syllabus, 22-Slide Presenter Script, Copy-Paste Prompts, and Instructor Troubleshooting Cheat Sheet.
* **[`docs/attendee_quickstart_handout.md`](docs/attendee_quickstart_handout.md)** — Attendee Quickstart Handout with the 4 sequential Vibe Coding prompts + Sprint 5 Zero-Trust Cloud Run & Cloud Armor deployment prompt.
* **[`docs/finops_deployment_security_validation_report.md`](docs/finops_deployment_security_validation_report.md)** — Full Infrastructure & Codebase Security Audit (`SEC-01` through `SEC-05`), Cloud Armor WAF verification (`SQLi`/`XSS` `HTTP 403`), and functional validation report.
* **[`docs/google_ai_antigravity_ecosystem_guide.md`](docs/google_ai_antigravity_ecosystem_guide.md)** — Executive Guide to the Google AI Ecosystem (Gemini Enterprise, NotebookLM, Google AI Studio, Antigravity Engine vs. Antigravity IDE) & 3-Presenter Animated Cartoon Avatar Video links.

---

## 🛠️ Quickstart & Deployment

### Run Locally (`Port 8081`)
```bash
export PORT=8081
export GOOGLE_CLOUD_PROJECT="argolis-finops-hub-14419"
python3 server.py
```

### Deploy to Google Cloud Run + Global HTTPS Load Balancer + Cloud Armor WAF (`Argolis`)
```bash
chmod +x deploy_to_argolis.sh
./deploy_to_argolis.sh
```
Or provision directly via Terraform:
```bash
cd terraform
terraform init
terraform apply -var="project_id=argolis-finops-hub-14419" -var="region=us-central1"
```
