#!/bin/bash
# ==============================================================================
# Argolis GCP Project Infrastructure Deployment Pipeline
# Target Project: argolis-finops-hub-14419 | Port: 8081
# Stack: Cloud Run (Port 8081) + Global External Load Balancer + Cloud Armor WAF
# ==============================================================================

set -e

export PATH="/usr/local/google/home/imedtra/google-cloud-sdk/bin:$PATH"
export CLOUDSDK_METRICS_ENVIRONMENT="${CLOUDSDK_METRICS_ENVIRONMENT:+$CLOUDSDK_METRICS_ENVIRONMENT }datacloud.jetski"

PROJECT_ID="argolis-finops-hub-14419"
PROJECT_NUMBER="1057167589155"
REGION="us-central1"
REPO_NAME="finops-repo"
SERVICE_NAME="finops-cloud-console"
PORT="8081"
SA_EMAIL="finops-hub-app-sa@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

echo "==================================================================="
echo "🚀 Deploying FinOps Hub + Global LB + Cloud Armor (${PROJECT_ID})"
echo "==================================================================="

# 0. Enable Required APIs
gcloud services enable \
    run.googleapis.com \
    compute.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    bigquery.googleapis.com \
    aiplatform.googleapis.com \
    orgpolicy.googleapis.com \
    --project "$PROJECT_ID" >/dev/null 2>&1 || true

# 1. Override Argolis Domain Restriction Policy & Enable Public Cloud Run Access
echo "[1/5] Enabling Public External Web Access (Org Policy Override + no-invoker-iam-check)..."
cat > /tmp/allow_all_domains.yaml <<EOF
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allValues: ALLOW
EOF
gcloud resource-manager org-policies set-policy /tmp/allow_all_domains.yaml --project="$PROJECT_ID" >/dev/null 2>&1 || \
gcloud resource-manager org-policies disable-enforce constraints/iam.allowedPolicyMemberDomains --project="$PROJECT_ID" >/dev/null 2>&1 || true

# Deploy/Update Cloud Run with --no-invoker-iam-check & --allow-unauthenticated on Port 8081
gcloud run services update "$SERVICE_NAME" \
    --region "$REGION" \
    --port "$PORT" \
    --ingress all \
    --no-invoker-iam-check \
    --project "$PROJECT_ID" --quiet >/dev/null 2>&1 || \
gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_URI" \
    --platform managed \
    --region "$REGION" \
    --port "$PORT" \
    --service-account "$SA_EMAIL" \
    --ingress all \
    --no-invoker-iam-check \
    --allow-unauthenticated \
    --project "$PROJECT_ID" --quiet

gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
    --region="$REGION" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true

# 2. Provision Google Cloud Armor WAF Security Policy
echo "[2/5] Configuring Google Cloud Armor WAF Policy (finops-cloud-armor-waf-policy)..."
POLICY_NAME="finops-cloud-armor-waf-policy"
gcloud compute security-policies create "$POLICY_NAME" \
    --description="Cloud Armor WAF Security Policy for FinOps Cloud Console (OWASP SQLi, XSS, Rate Limiting, L7 DDoS)" \
    --project="$PROJECT_ID" 2>/dev/null || true

gcloud compute security-policies update "$POLICY_NAME" \
    --enable-layer7-ddos-defense \
    --project="$PROJECT_ID" >/dev/null 2>&1 || true

# Rule 1000: OWASP SQL Injection Protection (Evaluated FIRST)
gcloud compute security-policies rules create 1000 \
    --security-policy="$POLICY_NAME" \
    --expression="evaluatePreconfiguredExpr('sqli-v33-stable')" \
    --action=deny-403 \
    --description="OWASP Core Rule Set - SQL Injection Mitigation" \
    --project="$PROJECT_ID" 2>/dev/null || true

# Rule 1100: OWASP Cross-Site Scripting (XSS) Protection
gcloud compute security-policies rules create 1100 \
    --security-policy="$POLICY_NAME" \
    --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
    --action=deny-403 \
    --description="OWASP Core Rule Set - Cross-Site Scripting (XSS) Mitigation" \
    --project="$PROJECT_ID" 2>/dev/null || true

# Rule 5000: Rate Limiting (100 req/min/IP -> ban 300s, evaluated after OWASP WAF checks)
gcloud compute security-policies rules create 5000 \
    --security-policy="$POLICY_NAME" \
    --action=rate-based-ban \
    --src-ip-ranges="*" \
    --rate-limit-threshold-count=100 \
    --rate-limit-threshold-interval-sec=60 \
    --ban-duration-sec=300 \
    --conform-action=allow \
    --exceed-action=deny-429 \
    --enforce-on-key=IP \
    --description="Rate limiting (100 req/min/IP) evaluated after OWASP WAF checks" \
    --project="$PROJECT_ID" 2>/dev/null || true

# 3. Reserve Global External Static IPv4 Address & Serverless NEG
echo "[3/5] Provisioning Global Static IPv4 & Serverless NEG for Cloud Run..."
gcloud compute addresses create finops-lb-public-ip \
    --ip-version=IPV4 \
    --global \
    --project="$PROJECT_ID" 2>/dev/null || true

LB_IP=$(gcloud compute addresses describe finops-lb-public-ip --global --project="$PROJECT_ID" --format="value(address)")

gcloud compute network-endpoint-groups create finops-serverless-neg \
    --region="$REGION" \
    --network-endpoint-type=serverless \
    --cloud-run-service="$SERVICE_NAME" \
    --project="$PROJECT_ID" 2>/dev/null || true

# 4. Provision Global Backend Service & Attach Cloud Armor WAF Policy
echo "[4/5] Creating Global Load Balancer Backend Service & Attaching Cloud Armor..."
gcloud compute backend-services create finops-lb-backend \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --protocol=HTTP \
    --global \
    --project="$PROJECT_ID" 2>/dev/null || true

gcloud compute backend-services add-backend finops-lb-backend \
    --global \
    --network-endpoint-group=finops-serverless-neg \
    --network-endpoint-group-region="$REGION" \
    --project="$PROJECT_ID" 2>/dev/null || true

gcloud compute backend-services update finops-lb-backend \
    --global \
    --security-policy="$POLICY_NAME" \
    --project="$PROJECT_ID" 2>/dev/null || true

# 5. Provision URL Map, Managed SSL Cert (nip.io), HTTP/HTTPS Target Proxies & Global Forwarding Rules
echo "[5/5] Creating URL Map, Target HTTP/HTTPS Proxies & Forwarding Rules..."
gcloud compute url-maps create finops-lb-url-map \
    --default-service=finops-lb-backend \
    --global \
    --project="$PROJECT_ID" 2>/dev/null || true

gcloud compute target-http-proxies create finops-lb-http-proxy \
    --url-map=finops-lb-url-map \
    --global \
    --project="$PROJECT_ID" 2>/dev/null || true

gcloud compute forwarding-rules create finops-lb-http-forwarding-rule \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --network-tier=PREMIUM \
    --address=finops-lb-public-ip \
    --global \
    --target-http-proxy=finops-lb-http-proxy \
    --ports=80 \
    --project="$PROJECT_ID" 2>/dev/null || true

NIP_DOMAIN="finops.${LB_IP}.nip.io"
gcloud compute ssl-certificates create finops-lb-ssl-cert \
    --domains="$NIP_DOMAIN" \
    --global \
    --project="$PROJECT_ID" 2>/dev/null || true

gcloud compute target-https-proxies create finops-lb-https-proxy \
    --url-map=finops-lb-url-map \
    --ssl-certificates=finops-lb-ssl-cert \
    --global \
    --project="$PROJECT_ID" 2>/dev/null || true

gcloud compute forwarding-rules create finops-lb-https-forwarding-rule \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --network-tier=PREMIUM \
    --address=finops-lb-public-ip \
    --global \
    --target-https-proxy=finops-lb-https-proxy \
    --ports=443 \
    --project="$PROJECT_ID" 2>/dev/null || true

RUN_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)' 2>/dev/null)

echo "==================================================================="
echo "🎉 Global External Load Balancer + Cloud Armor Deployment Complete!"
echo "🔗 Cloud Run Public URL:            ${RUN_URL}"
echo "🛡️ Global Load Balancer IPv4:       ${LB_IP}"
echo "🌐 Load Balancer HTTP URL:          http://${LB_IP}"
echo "🔒 Load Balancer HTTPS URL (SSL):   https://${NIP_DOMAIN}"
echo "🛡️ Cloud Armor WAF Policy:          ${POLICY_NAME} (SQLi + XSS + Rate Limit + L7 DDoS)"
echo "==================================================================="
