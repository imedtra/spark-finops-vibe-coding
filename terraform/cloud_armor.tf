# Google Cloud Armor Security Policy (WAF & DDoS Mitigation)
resource "google_compute_security_policy" "cloud_armor_policy" {
  name        = "finops-cloud-armor-waf-policy"
  description = "Cloud Armor WAF Security Policy for FinOps Web Hub"
  project     = var.project_id

  # Layer 7 Adaptive DDoS Protection
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }

  # Rule 1000: OWASP SQL Injection Protection (Evaluated FIRST before rate-limit allow)
  rule {
    action   = "deny(403)"
    priority = "1000"

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }

    description = "OWASP Core Rule Set - SQL Injection Mitigation"
  }

  # Rule 1100: OWASP Cross-Site Scripting (XSS) Protection
  rule {
    action   = "deny(403)"
    priority = "1100"

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }

    description = "OWASP Core Rule Set - Cross-Site Scripting (XSS) Mitigation"
  }

  # Rule 5000: Rate Limiting Rule (Max 100 requests per 1 minute per IP, evaluated after OWASP WAF checks)
  rule {
    action   = "rate_based_ban"
    priority = "5000"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_threshold {
      count        = 100
      interval_sec = 60
    }

    ban_threshold {
      count        = 200
      interval_sec = 60
    }

    ban_duration_sec = 300

    description = "Rate limiting (100 req/min/IP) evaluated after OWASP WAF checks"
  }

  # Default Rule: Allow legitimate traffic
  rule {
    action   = "allow"
    priority = "2147483647"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    description = "Default allow rule for web traffic"
  }

  depends_on = [google_project_service.apis]
}
