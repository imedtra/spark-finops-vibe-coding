# Google Cloud Run v2 Service Definition (Port 8081)
resource "google_cloud_run_v2_service" "finops_console" {
  name     = "finops-cloud-console"
  location = var.region
  project  = var.project_id

  # Allow External + Cloud Load Balancing access
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = true

  template {
    service_account = google_service_account.finops_sa.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/finops-repo/finops-cloud-console:latest"

      ports {
        container_port = 8081
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "BQ_DATASET_ID"
        value = "finops_billing_analytics"
      }

      env {
        name  = "VERTEX_MODEL"
        value = "gemini-2.5-flash"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }

  depends_on = [
    google_project_service.apis,
    google_service_account.finops_sa,
    google_project_organization_policy.override_allowed_domains
  ]
}

# Allow IAM invocation from Cloud Load Balancer Serverless NEG & External Web Users
resource "google_cloud_run_v2_service_iam_member" "lb_invoker" {
  project    = var.project_id
  location   = google_cloud_run_v2_service.finops_console.location
  name       = google_cloud_run_v2_service.finops_console.name
  role       = "roles/run.invoker"
  member     = "allUsers"
  depends_on = [google_project_organization_policy.override_allowed_domains]
}
