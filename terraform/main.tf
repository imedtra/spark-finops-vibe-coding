terraform {
  required_version = ">= 1.3.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  type        = string
  default     = "argolis-finops-hub-14419"
  description = "The target GCP Project ID for deployment"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "Primary GCP region for Cloud Run and Serverless NEG"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Enable Required GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "compute.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "aiplatform.googleapis.com",
    "orgpolicy.googleapis.com"
  ])

  project                    = var.project_id
  service                    = each.key
  disable_on_destroy         = false
  disable_dependent_services = false
}

# 2. Override Argolis Domain Restricted Sharing Policy so External Load Balancer / Web Users can invoke
resource "google_project_organization_policy" "override_allowed_domains" {
  project    = var.project_id
  constraint = "constraints/iam.allowedPolicyMemberDomains"

  list_policy {
    allow {
      all = true
    }
  }

  depends_on = [google_project_service.apis]
}

# 3. Dedicated IAM Service Account for FinOps Hub Application
resource "google_service_account" "finops_sa" {
  account_id   = "finops-hub-app-sa"
  display_name = "FinOps Cloud Console App Identity"
  project      = var.project_id
  depends_on   = [google_project_service.apis]
}

# 4. Least Privilege IAM Role Bindings
resource "google_project_iam_member" "bq_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.finops_sa.email}"
}

resource "google_project_iam_member" "bq_viewer" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.finops_sa.email}"
}

resource "google_project_iam_member" "vertex_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.finops_sa.email}"
}
