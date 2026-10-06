# 1. Serverless Network Endpoint Group (NEG) pointing to Cloud Run
resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = "finops-serverless-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  project               = var.project_id

  cloud_run {
    service = google_cloud_run_v2_service.finops_console.name
  }

  depends_on = [google_cloud_run_v2_service.finops_console]
}

# 2. Global External Load Balancer Backend Service with Cloud Armor attached
resource "google_compute_backend_service" "backend_service" {
  name                  = "finops-lb-backend"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  project               = var.project_id

  # Attach Cloud Armor WAF Policy directly to Load Balancer Backend
  security_policy = google_compute_security_policy.cloud_armor_policy.self_link

  backend {
    group = google_compute_region_network_endpoint_group.serverless_neg.id
  }

  depends_on = [
    google_compute_region_network_endpoint_group.serverless_neg,
    google_compute_security_policy.cloud_armor_policy
  ]
}

# 3. URL Map
resource "google_compute_url_map" "url_map" {
  name            = "finops-lb-url-map"
  default_service = google_compute_backend_service.backend_service.id
  project         = var.project_id
}

# 4. Global Reserved Public External IPv4 Address
resource "google_compute_global_address" "lb_ip" {
  name    = "finops-lb-public-ip"
  project = var.project_id
}

# 5. Google-Managed SSL Certificate via nip.io for HTTPS Load Balancing
resource "google_compute_managed_ssl_certificate" "lb_ssl_cert" {
  name    = "finops-lb-ssl-cert"
  project = var.project_id

  managed {
    domains = ["finops.${google_compute_global_address.lb_ip.address}.nip.io"]
  }
}

# 6. Target HTTP Proxy (Port 80)
resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "finops-lb-http-proxy"
  url_map = google_compute_url_map.url_map.id
  project = var.project_id
}

# 7. Target HTTPS Proxy (Port 443)
resource "google_compute_target_https_proxy" "https_proxy" {
  name             = "finops-lb-https-proxy"
  url_map          = google_compute_url_map.url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.lb_ssl_cert.id]
  project          = var.project_id
}

# 8. Global Forwarding Rule (HTTP Port 80)
resource "google_compute_global_forwarding_rule" "http_forwarding_rule" {
  name                  = "finops-lb-http-forwarding-rule"
  target                = google_compute_target_http_proxy.http_proxy.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
  project               = var.project_id
}

# 9. Global Forwarding Rule (HTTPS Port 443)
resource "google_compute_global_forwarding_rule" "https_forwarding_rule" {
  name                  = "finops-lb-https-forwarding-rule"
  target                = google_compute_target_https_proxy.https_proxy.id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
  project               = var.project_id
}

# Outputs
output "load_balancer_ip" {
  value       = google_compute_global_address.lb_ip.address
  description = "The Public External IPv4 Address of the Global Load Balancer (Cloud Armor Protected)"
}

output "load_balancer_http_url" {
  value       = "http://${google_compute_global_address.lb_ip.address}"
  description = "External HTTP URL via Global Load Balancer + Cloud Armor"
}

output "load_balancer_https_url" {
  value       = "https://finops.${google_compute_global_address.lb_ip.address}.nip.io"
  description = "External HTTPS URL via Global Load Balancer + Cloud Armor (nip.io Managed SSL)"
}

output "cloud_run_url" {
  value       = google_cloud_run_v2_service.finops_console.uri
  description = "The Direct Cloud Run Service URL"
}
