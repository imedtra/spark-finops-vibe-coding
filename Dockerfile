# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables for Python & Cloud Run (Port 8081)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8081 \
    GOOGLE_CLOUD_PROJECT=argolis-finops-hub-14419 \
    BQ_DATASET_ID=finops_billing_analytics \
    VERTEX_REGION=us-central1 \
    VERTEX_MODEL=gemini-2.5-flash

# Create a non-root system user for Google container security compliance
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy only allowlisted production application files (no .tf, .sh, or .log files)
COPY index.html style.css app.js server.py /app/

# Set appropriate permissions for non-root execution
RUN chown -R appuser:appgroup /app && chmod 550 /app/server.py && chmod 440 /app/index.html /app/style.css /app/app.js

# Switch to unprivileged user
USER appuser

# Expose port 8081
EXPOSE 8081

# Launch server
CMD ["python3", "server.py"]
