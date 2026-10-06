#!/bin/bash
# ==============================================================================
# Google Cloud Run Automated Deployment Script
# Zero-Key Security Architecture (Ambient IAM / Service Account Authentication)
# ==============================================================================

set -e

# Configuration
SERVICE_NAME="finops-cloud-console"
REGION="us-central1"
SERVICE_ACCOUNT_NAME="finops-hub-sa"

# Color helpers
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}🚀 Google Cloud Run Security & Deployment Pipeline ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Verify gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed or not in PATH.${NC}"
    exit 1
fi

# 2. Get active GCP project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No active GCP project set. Fetching default project...${NC}"
    PROJECT_ID="cloudtop-prod-europe-north"
fi

echo -e "📦 Target GCP Project: ${GREEN}${PROJECT_ID}${NC}"
echo -e "📍 Target Region: ${GREEN}${REGION}${NC}"

# 3. Enable required GCP APIs
echo -e "\n${BLUE}[1/5] Enabling GCP APIs (Cloud Run, Cloud Build, BigQuery, Vertex AI)...${NC}"
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    bigquery.googleapis.com \
    aiplatform.googleapis.com \
    --project "$PROJECT_ID"

# 4. Provision Dedicated IAM Service Account
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo -e "\n${BLUE}[2/5] Setting up dedicated IAM Service Account: ${SERVICE_ACCOUNT_EMAIL}...${NC}"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}Creating Service Account...${NC}"
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --display-name="FinOps Cloud Console Identity" \
        --project="$PROJECT_ID"
fi

# 5. Grant Minimum Necessary Security Roles (Principle of Least Privilege)
echo -e "\n${BLUE}[3/5] Assigning Least Privilege IAM Roles...${NC}"

# BigQuery Job User (run billing export queries)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/bigquery.jobUser" \
    --condition=None --quiet

# Vertex AI User (call Gemini models)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/aiplatform.user" \
    --condition=None --quiet

# 6. Build and Deploy Container to Cloud Run
echo -e "\n${BLUE}[4/5] Submitting build to Google Cloud Build...${NC}"
gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" --project="$PROJECT_ID"

echo -e "\n${BLUE}[5/5] Deploying container to Cloud Run with IAM Identity...${NC}"
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
    --platform managed \
    --region "$REGION" \
    --service-account "$SERVICE_ACCOUNT_EMAIL" \
    --allow-unauthenticated \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
    --project "$PROJECT_ID"

# Fetch deployed Cloud Run URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)' 2>/dev/null)

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}🔗 Live Cloud Run URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}====================================================${NC}"
