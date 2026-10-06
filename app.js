/**
 * Google Cloud FinOps Hub - Production Application Controller
 * High-performance, reactive, Google Cloud Console UI patterns.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // -------------------------------------------------------------
  // Application Data & State
  // -------------------------------------------------------------
  const state = {
    activeTab: 'overview',
    theme: localStorage.getItem('gcp_finops_theme') || 'light',
    dateRange: '30',
    selectedEnv: 'all',
    selectedProject: 'all',
    chartMode: 'line', // 'line' or 'bar'
    sortCol: 'cost',
    sortDir: 'desc',
    lastAppliedRec: null,
    totalBaseSpend: 14290.50,
    activeSavings: 3180.50,
  };

  // Chart.js instances declared at top of scope to avoid Temporal Dead Zone (TDZ) in applyTheme()
  let trendChart = null;
  let shareChart = null;
  let regionChart = null;
  let projectChart = null;

  // Human-Readable Cloud Project & Organization Directory
  const PROJECT_DIRECTORY = {
    'org': {
      id: 'org',
      orgId: 'org-argolis-107365563435',
      name: 'Argolis FinOps Organization (Entire Org)',
      shortLabel: 'Organization: Argolis FinOps Org (45+ Projects)',
      env: 'Organization',
      folder: 'Root Organization (107365563435)',
      icon: 'domain',
      spend: 145763.10,
      budget: 165000.00
    },
    'multi': {
      id: 'multi',
      orgId: 'portfolio-5-projects',
      name: 'Multiple Selected Projects (Portfolio View)',
      shortLabel: 'Multiple Projects (5 Selected)',
      env: 'Multi-Project',
      folder: 'Cloud FinOps Portfolio',
      icon: 'folder_shared',
      spend: 14290.50,
      budget: 18000.00
    },
    'argolis-finops-hub-14419': {
      id: 'argolis-finops-hub-14419',
      name: 'Argolis FinOps Hub',
      shortLabel: 'Argolis FinOps Hub (argolis-finops-hub-14419)',
      env: 'Production',
      folder: 'FinOps Platform',
      icon: 'hub',
      spend: 1840.00,
      budget: 2500.00
    },
    'htr-prod-service': {
      id: 'htr-prod-service',
      name: 'HTR Core Production Service',
      shortLabel: 'HTR Core Production (htr-prod-service)',
      env: 'Production',
      folder: 'Core Workloads',
      icon: 'rocket_launch',
      spend: 5410.00,
      budget: 6500.00
    },
    'htr-k8s-cluster': {
      id: 'htr-k8s-cluster',
      name: 'HTR GKE Kubernetes Platform',
      shortLabel: 'HTR GKE Platform (htr-k8s-cluster)',
      env: 'Production',
      folder: 'Container Infrastructure',
      icon: 'deployed_code',
      spend: 3840.50,
      budget: 4500.00
    },
    'htr-data-warehouse': {
      id: 'htr-data-warehouse',
      name: 'HTR Enterprise Data Warehouse',
      shortLabel: 'HTR Data Warehouse (htr-data-warehouse)',
      env: 'Staging',
      folder: 'Data & Analytics',
      icon: 'database',
      spend: 1620.00,
      budget: 2000.00
    },
    'htr-analytics-prod': {
      id: 'htr-analytics-prod',
      name: 'HTR BigQuery Analytics Prod',
      shortLabel: 'HTR Analytics Prod (htr-analytics-prod)',
      env: 'Production',
      folder: 'Data & Analytics',
      icon: 'query_stats',
      spend: 1580.00,
      budget: 2000.00
    },
    'htr-dev-service': {
      id: 'htr-dev-service',
      name: 'HTR Developer Sandbox',
      shortLabel: 'HTR Dev Sandbox (htr-dev-service)',
      env: 'Development',
      folder: 'Engineering Sandboxes',
      icon: 'science',
      spend: 680.00,
      budget: 1000.00
    }
  };

  function getProjectDisplayName(projectId) {
    const entry = PROJECT_DIRECTORY[projectId];
    return entry ? `${entry.name} (${entry.id})` : projectId;
  }

  function getProjectShortName(projectId) {
    const entry = PROJECT_DIRECTORY[projectId];
    return entry ? entry.name : projectId;
  }

  // Google Cloud Recommender Database
  const recommendations = [
    {
      id: 'rec-1',
      title: 'GKE Node Pool Auto-Scaling & Downsizing',
      category: 'rightsizing',
      impact: 'High',
      project: 'htr-k8s-cluster',
      resource: 'us-central1-a/prod-node-pool-c2',
      savings: 820.00,
      status: 'pending',
      desc: 'Average CPU utilization is 18%. Reduce node pool min count from 6 to 3 nodes and enable GKE cluster autoscaler profile optimize-utilization.',
      command: 'gcloud container clusters update htr-k8s-cluster --enable-autoscaling --min-nodes=3 --max-nodes=8'
    },
    {
      id: 'rec-2',
      title: 'Delete Unattached Standard & SSD Disks',
      category: 'idle',
      impact: 'High',
      project: 'htr-dev-service',
      resource: '5 persistent disks (total 1.2 TB)',
      savings: 310.00,
      status: 'pending',
      desc: 'Detected 5 persistent disks unattached to any VM for > 90 days with 0 read/write IOPS. Create final snapshot and delete volume.',
      command: 'gcloud compute disks delete pd-test-build-01 pd-test-build-02 --zone=us-central1-a --quiet'
    },
    {
      id: 'rec-3',
      title: 'Purchase 3-Year Flexible Compute Committed Use Discount (CUD)',
      category: 'commitment',
      impact: 'High',
      project: 'htr-prod-service',
      resource: 'Baseline N2/N2D Compute',
      savings: 1050.50,
      status: 'pending',
      desc: 'Baseline usage of 32 vCPUs consistently active for 180+ days. Purchasing a 3-year flexible commitment saves 57% over on-demand rates.',
      command: 'gcloud compute commitments create cud-n2-3yr --plan=THIRTY_SIX_MONTH --resources=vcpu=32,memory=128GB'
    },
    {
      id: 'rec-4',
      title: 'Downsize Underutilized Compute Engine VM: dev-test-vm',
      category: 'rightsizing',
      impact: 'Medium',
      project: 'htr-dev-service',
      resource: 'e2-standard-4 (us-central1-b)',
      savings: 45.00,
      status: 'pending',
      desc: 'Average CPU is < 4% and memory usage is < 12%. Recommender suggests downsizing to e2-micro or e2-small.',
      command: 'gcloud compute instances set-machine-type dev-test-vm --machine-type=e2-micro'
    },
    {
      id: 'rec-5',
      title: 'Cloud Storage Lifecycle Policy: Move Cold Buckets to Archive',
      category: 'storage',
      impact: 'Medium',
      project: 'htr-data-warehouse',
      resource: 'gs://htr-raw-telemetry-archive',
      savings: 120.00,
      status: 'pending',
      desc: '38 TB of log archives unread for > 60 days. Transitioning from Standard to Archive Storage saves $0.018/GB/mo.',
      command: 'gsutil lifecycle set lifecycle-archive.json gs://htr-raw-telemetry-archive'
    },
    {
      id: 'rec-6',
      title: 'Release Unused External Static IP Addresses',
      category: 'idle',
      impact: 'Low',
      project: 'htr-prod-service',
      resource: '3 Reserved IP addresses (global)',
      savings: 28.00,
      status: 'pending',
      desc: '3 external static IP addresses have no associated VM or load balancer forwarding rule and incur hourly unattached charges.',
      command: 'gcloud compute addresses delete legacy-ip-1 legacy-ip-2 --global --quiet'
    },
    {
      id: 'rec-7',
      title: 'BigQuery Physical Storage Billing Model Transition',
      category: 'storage',
      impact: 'Medium',
      project: 'htr-analytics-prod',
      resource: 'htr-billing-analytics dataset',
      savings: 140.00,
      status: 'pending',
      desc: 'Tables have > 80% compression ratio. Switching billing model from Logical to Physical storage cuts storage invoice by 42%.',
      command: 'bq update --storage_billing_model=PHYSICAL htr-billing-analytics'
    },
    {
      id: 'rec-8',
      title: 'Turn Off Idle Dev Sandbox Cloud SQL Instance on Weekends',
      category: 'idle',
      impact: 'Medium',
      project: 'htr-dev-service',
      resource: 'mysql-dev-sandbox (europe-west1)',
      savings: 87.00,
      status: 'pending',
      desc: 'Database receives 0 queries between Friday 18:00 and Monday 07:00. Implement Cloud Scheduler to stop/start off-hours.',
      command: 'gcloud sql instances patch mysql-dev-sandbox --activation-policy=NEVER'
    }
  ];

  // Detailed GCP Billing Services Data (Default + Per BigQuery Export Table)
  const bqTableCatalog = {
    gcp_billing_export_v1: [
      {
        service: 'Compute Engine',
        sku: 'N2 Custom Instance Core running in Americas',
        project: 'htr-prod-service',
        region: 'us-central1',
        env: 'prod',
        usage: '1,420 Hours',
        cost: 5410.00,
        trend: '+2.1%',
        trendUp: true
      },
      {
        service: 'Google Kubernetes Engine (GKE)',
        sku: 'GKE Cluster Management Fee & Node Pools',
        project: 'htr-k8s-cluster',
        region: 'us-central1',
        env: 'prod',
        usage: '32 Node Pool Hours',
        cost: 3840.50,
        trend: '+6.8%',
        trendUp: true
      },
      {
        service: 'Vertex AI & Gemini Enterprise',
        sku: 'Gemini 2.5 Flash API & Agent Inference',
        project: 'argolis-finops-hub-14419',
        region: 'us-central1',
        env: 'prod',
        usage: '2.4M Tokens',
        cost: 1840.00,
        trend: '+3.2%',
        trendUp: true
      },
      {
        service: 'Cloud Storage (GCS)',
        sku: 'Standard Storage Multi-region (US)',
        project: 'htr-data-warehouse',
        region: 'us-multi-region',
        env: 'staging',
        usage: '48.5 TB/Month',
        cost: 1620.00,
        trend: '-1.4%',
        trendUp: false
      },
      {
        service: 'BigQuery Analytics',
        sku: 'Analysis (Queries scanned)',
        project: 'htr-analytics-prod',
        region: 'us-central1',
        env: 'prod',
        usage: '18.2 TB Processed',
        cost: 1580.00,
        trend: '-0.5%',
        trendUp: false
      }
    ],
    gcp_billing_export_resource_v1: [
      {
        service: 'Compute Engine (Resource Level)',
        sku: 'gce-prod-web-01..12 (n2-standard-8)',
        project: 'htr-prod-service',
        region: 'us-central1',
        env: 'prod',
        usage: '8,640 vCPU Hours',
        cost: 5890.00,
        trend: '+1.9%',
        trendUp: true
      },
      {
        service: 'Google Kubernetes Engine (Pod Level)',
        sku: 'gke-prod-pool-c2-standard-8',
        project: 'htr-k8s-cluster',
        region: 'us-central1',
        env: 'prod',
        usage: '48 Pod Workloads',
        cost: 4120.00,
        trend: '+5.4%',
        trendUp: true
      },
      {
        service: 'Cloud SQL for PostgreSQL',
        sku: 'Enterprise Plus db-custom-8-32768',
        project: 'htr-data-warehouse',
        region: 'us-central1',
        env: 'staging',
        usage: '720 Hours',
        cost: 780.00,
        trend: '+0.2%',
        trendUp: true
      },
      {
        service: 'BigQuery Storage (Physical)',
        sku: 'Physical Active Storage (Compressed)',
        project: 'htr-analytics-prod',
        region: 'us-central1',
        env: 'prod',
        usage: '34.5 TB Physical',
        cost: 690.00,
        trend: '-12.0%',
        trendUp: false
      },
      {
        service: 'Cloud Run Services',
        sku: 'finops-cloud-console-00001 (CPU/Memory)',
        project: 'argolis-finops-hub-14419',
        region: 'us-central1',
        env: 'prod',
        usage: '1.2M vCPU-sec',
        cost: 420.00,
        trend: '-4.1%',
        trendUp: false
      }
    ],
    gcp_billing_export_pricing_v1: [
      {
        service: 'Compute Engine CUD Pricing',
        sku: 'N2 Core On-Demand vs 3Yr CUD Rate',
        project: 'htr-prod-service',
        region: 'us-central1',
        env: 'prod',
        usage: '$0.031611 / vCPU hr',
        cost: 3120.00,
        trend: '-9.2%',
        trendUp: false
      },
      {
        service: 'GKE Autopilot SKU Pricing',
        sku: 'Autopilot Pod vCPU & Memory SKU',
        project: 'htr-k8s-cluster',
        region: 'us-central1',
        env: 'prod',
        usage: '$0.0445 / vCPU hr',
        cost: 2890.00,
        trend: '-6.1%',
        trendUp: false
      },
      {
        service: 'Committed Use Discounts (CUD)',
        sku: '3-Year Flexible Compute CUD Catalog Price',
        project: 'argolis-finops-hub-14419',
        region: 'us-central1',
        env: 'prod',
        usage: '57% Discount Tier',
        cost: 2350.00,
        trend: '-18.5%',
        trendUp: false
      },
      {
        service: 'BigQuery Editions Pricing',
        sku: 'Enterprise Edition Slot Autoscaling',
        project: 'htr-analytics-prod',
        region: 'us-central1',
        env: 'prod',
        usage: '200 Baseline Slots',
        cost: 1450.00,
        trend: '-11.4%',
        trendUp: false
      }
    ]
  };

  let serviceCostData = [...bqTableCatalog.gcp_billing_export_v1];

  // BigQuery Pre-canned SQL Queries
  const sqlPresets = {
    topServices: `/* Top 10 Google Cloud Services by Monthly Cost */
SELECT
  service.description AS service_name,
  sku.description AS sku_description,
  project.id AS project_id,
  location.region AS region,
  ROUND(SUM(cost), 2) AS total_cost_usd,
  ROUND(SUM(usage.amount_in_pricing_units), 2) AS total_usage,
  usage.pricing_unit
FROM
  \`htr-billing-analytics.gcp_billing_export_v1\`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND cost > 0
GROUP BY
  1, 2, 3, 4, 7
ORDER BY
  total_cost_usd DESC
LIMIT 10;`,

    idleDisks: `/* Find Unattached Persistent Disks Incurring Daily Charges */
SELECT
  resource.name AS disk_name,
  project.id AS project_id,
  location.zone,
  sku.description,
  ROUND(SUM(cost), 2) AS unattached_cost_30d
FROM
  \`htr-billing-analytics.gcp_billing_export_v1\`
WHERE
  service.description = 'Compute Engine'
  AND sku.description LIKE '%Storage PD%'
  AND (SELECT value FROM UNNEST(labels) WHERE key = 'attached') IS NULL
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  1, 2, 3, 4
ORDER BY
  unattached_cost_30d DESC;`,

    untaggedCost: `/* Audit Spend Missing 'environment' or 'team' Label */
SELECT
  project.id AS project_id,
  service.description AS service_name,
  ROUND(SUM(cost), 2) AS unallocated_cost_usd,
  ROUND(SUM(cost) / (SELECT SUM(cost) FROM \`htr-billing-analytics.gcp_billing_export_v1\` WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)) * 100, 2) AS pct_total_spend
FROM
  \`htr-billing-analytics.gcp_billing_export_v1\`
WHERE
  (SELECT value FROM UNNEST(labels) WHERE key = 'env') IS NULL
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  1, 2
ORDER BY
  unallocated_cost_usd DESC;`,

    skuDaily: `/* Daily Cost Trajectory by SKU for Anomaly Detection */
SELECT
  DATE(usage_start_time) AS usage_date,
  service.description AS service_name,
  sku.description AS sku_name,
  ROUND(SUM(cost), 2) AS daily_cost_usd
FROM
  \`htr-billing-analytics.gcp_billing_export_v1\`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
GROUP BY
  1, 2, 3
ORDER BY
  usage_date DESC, daily_cost_usd DESC
LIMIT 20;`
  };

  // Sample Query Results Data for BigQuery Studio
  const sampleQueryResults = {
    topServices: {
      columns: ['Service Name', 'SKU Description', 'Project ID', 'Region', 'Total Cost ($)', 'Usage'],
      rows: [
        ['Compute Engine', 'N2 Custom Instance Core', 'htr-prod-service', 'us-central1', '$5,410.00', '1,420 Hours'],
        ['GKE Cluster', 'GKE Management & Node Pool', 'htr-k8s-cluster', 'us-central1', '$3,840.50', '32 Node Pool Hours'],
        ['Cloud Storage', 'Standard Storage Multi-region', 'htr-data-warehouse', 'us-multi', '$1,620.00', '48.5 TB'],
        ['BigQuery Analytics', 'Analysis Queries', 'htr-analytics-prod', 'us-central1', '$1,580.00', '18.2 TB Scanned']
      ]
    },
    idleDisks: {
      columns: ['Disk Name', 'Project ID', 'Zone', 'SKU', '30d Cost ($)'],
      rows: [
        ['pd-test-build-01', 'htr-dev-service', 'us-central1-a', 'SSD Storage', '$95.00'],
        ['pd-test-build-02', 'htr-dev-service', 'us-central1-a', 'SSD Storage', '$85.00'],
        ['pd-temp-scratch-03', 'htr-dev-service', 'us-central1-b', 'Standard PD', '$50.00'],
        ['pd-backup-old-v1', 'htr-dev-service', 'us-central1-c', 'Standard PD', '$45.00'],
        ['pd-staging-volume-09', 'htr-dev-service', 'us-central1-b', 'Standard PD', '$35.00']
      ]
    },
    untaggedCost: {
      columns: ['Project ID', 'Service Name', 'Unallocated Cost ($)', '% of Total Spend'],
      rows: [
        ['htr-dev-service', 'Compute Engine', '$540.20', '4.3%'],
        ['htr-analytics-prod', 'BigQuery Storage', '$120.40', '0.9%'],
        ['htr-data-warehouse', 'Cloud Storage', '$88.50', '0.7%']
      ]
    },
    skuDaily: {
      columns: ['Usage Date', 'Service Name', 'SKU Name', 'Daily Cost ($)'],
      rows: [
        ['2026-08-25', 'Compute Engine', 'N2 Custom Instance Core', '$180.40'],
        ['2026-08-25', 'GKE Cluster', 'Node Pool c2-standard-8', '$128.00'],
        ['2026-08-24', 'Compute Engine', 'N2 Custom Instance Core', '$179.80'],
        ['2026-08-24', 'BigQuery', 'Analysis On-Demand', '$52.10']
      ]
    }
  };

  // -------------------------------------------------------------
  // Theme Toggle Management (White View / Night View)
  // -------------------------------------------------------------
  const btnWhiteView = document.getElementById('btnWhiteView');
  const btnNightView = document.getElementById('btnNightView');

  function applyTheme(theme, notify = false) {
    document.documentElement.setAttribute('data-theme', theme);
    state.theme = theme;
    localStorage.setItem('gcp_finops_theme', theme);

    if (btnWhiteView && btnNightView) {
      if (theme === 'dark') {
        btnNightView.classList.add('active');
        btnWhiteView.classList.remove('active');
      } else {
        btnWhiteView.classList.add('active');
        btnNightView.classList.remove('active');
      }
    }

    // Re-render chart colors if charts exist
    if (trendChart) updateChartColors();
    if (shareChart) updateChartColors();
    if (regionChart) updateChartColors();
    if (projectChart) updateChartColors();

    if (notify) {
      showSnackbar(`Switched to Google Cloud ${theme === 'dark' ? 'Night' : 'White'} View.`);
    }
  }

  applyTheme(state.theme, false);

  if (btnWhiteView) {
    btnWhiteView.addEventListener('click', () => {
      applyTheme('light', true);
    });
  }

  if (btnNightView) {
    btnNightView.addEventListener('click', () => {
      applyTheme('dark', true);
    });
  }

  // -------------------------------------------------------------
  // Navigation & Tab Switching
  // -------------------------------------------------------------
  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  const viewSections = document.querySelectorAll('.view-section');
  const pageTitleText = document.getElementById('pageTitleText');

  const tabTitles = {
    overview: 'FinOps Overview',
    breakdown: 'Google Cloud Services Cost Breakdown',
    recommender: 'Google Cloud Recommender Hub',
    budgets: 'Budgets & Alerts Center',
    bigquery: 'BigQuery SQL Studio (Billing Export)',
    copilot: 'Gemini Cloud FinOps Copilot',
    settings: 'FinOps Configuration & Export Settings'
  };

  function switchTab(tabId) {
    state.activeTab = tabId;

    // Update active class on nav links
    navLinks.forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update active view section
    viewSections.forEach(section => {
      if (section.id === `view-${tabId}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Update title
    if (pageTitleText) {
      pageTitleText.textContent = tabTitles[tabId] || 'FinOps Hub';
    }

    // Lazy initialization of secondary charts
    if (tabId === 'breakdown') {
      setTimeout(() => initBreakdownCharts(), 50);
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // Cross-view trigger links
  document.querySelectorAll('.nav-link-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const target = trigger.getAttribute('data-target-tab');
      if (target) switchTab(target);
    });
  });

  const openGeminiActionBtn = document.getElementById('openGeminiActionBtn');
  const topGeminiBtn = document.getElementById('topGeminiBtn');
  [openGeminiActionBtn, topGeminiBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', () => switchTab('copilot'));
  });

  // Sidebar collapse toggle
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const cloudSidebar = document.getElementById('cloudSidebar');
  if (sidebarToggleBtn && cloudSidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      cloudSidebar.classList.toggle('collapsed');
    });
  }

  // Keyboard shortcut for search
  const globalSearchInput = document.getElementById('globalSearchInput');
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== globalSearchInput) {
      e.preventDefault();
      if (globalSearchInput) globalSearchInput.focus();
    }
  });

  // -------------------------------------------------------------
  // Chart.js Visualizations (Overview)
  // -------------------------------------------------------------
  function getThemeColors() {
    const isDark = state.theme === 'dark';
    return {
      textColor: isDark ? '#9aa0a6' : '#5f6368',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      tooltipBg: isDark ? '#28292a' : '#202124',
      tooltipText: '#ffffff',
      blue: isDark ? '#8ab4f8' : '#1a73e8',
      purple: isDark ? '#c58af9' : '#9334e6',
      green: isDark ? '#81c995' : '#1e8e3e',
      yellow: isDark ? '#fdd663' : '#f9ab00',
      red: isDark ? '#f28b82' : '#d93025'
    };
  }

  function initOverviewCharts() {
    const trendCtx = document.getElementById('costTrendChartCanvas');
    const shareCtx = document.getElementById('serviceShareChartCanvas');
    const colors = getThemeColors();

    // 1. Cost Trend Line/Stacked Chart
    if (trendCtx && typeof Chart !== 'undefined') {
      const labels = ['Jul 26', 'Jul 29', 'Aug 01', 'Aug 04', 'Aug 07', 'Aug 10', 'Aug 13', 'Aug 16', 'Aug 19', 'Aug 22', 'Aug 25'];
      const computeData = [175, 182, 178, 185, 190, 184, 188, 192, 195, 186, 180];
      const gkeData     = [120, 125, 130, 145, 150, 140, 142, 148, 155, 135, 128];
      const storageData = [54,  54,  55,  55,  56,  55,  55,  54,  55,  54,  54];
      const bqData      = [45,  50,  48,  62,  55,  48,  52,  60,  58,  50,  52];

      trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Compute Engine',
              data: computeData,
              borderColor: colors.blue,
              backgroundColor: isColorWithAlpha(colors.blue, 0.15),
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 3
            },
            {
              label: 'GKE Cluster',
              data: gkeData,
              borderColor: colors.purple,
              backgroundColor: isColorWithAlpha(colors.purple, 0.15),
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 3
            },
            {
              label: 'Cloud Storage',
              data: storageData,
              borderColor: colors.green,
              backgroundColor: isColorWithAlpha(colors.green, 0.15),
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 3
            },
            {
              label: 'BigQuery Analytics',
              data: bqData,
              borderColor: colors.yellow,
              backgroundColor: isColorWithAlpha(colors.yellow, 0.15),
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: colors.textColor, font: { size: 11 } }
            },
            tooltip: {
              backgroundColor: colors.tooltipBg,
              titleColor: colors.tooltipText,
              bodyColor: colors.tooltipText,
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: colors.textColor, font: { size: 10 } }
            },
            y: {
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.textColor,
                font: { size: 10 },
                callback: (val) => '$' + val
              }
            }
          }
        }
      });
    }

    // 2. Service Cost Share Donut Chart
    if (shareCtx && typeof Chart !== 'undefined') {
      const shareLabels = ['Compute Engine', 'GKE', 'Cloud Storage', 'BigQuery', 'Cloud SQL', 'Other'];
      const shareValues = [5410, 3840.5, 1620, 1580, 780, 819.5];
      const palette = [colors.blue, colors.purple, colors.green, colors.yellow, '#00acc1', '#78909c'];

      shareChart = new Chart(shareCtx, {
        type: 'doughnut',
        data: {
          labels: shareLabels,
          datasets: [{
            data: shareValues,
            backgroundColor: palette,
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: colors.tooltipBg,
              titleColor: colors.tooltipText,
              bodyColor: colors.tooltipText,
              callbacks: {
                label: (ctx) => `${ctx.label}: $${ctx.parsed.toLocaleString()} (${((ctx.parsed / 14050) * 100).toFixed(1)}%)`
              }
            }
          },
          cutout: '68%'
        }
      });

      // Render custom legend chips
      const legendContainer = document.getElementById('serviceShareLegend');
      if (legendContainer) {
        legendContainer.innerHTML = shareLabels.map((lbl, i) => `
          <div class="legend-chip">
            <span class="legend-dot" style="background-color: ${palette[i]};"></span>
            <span>${lbl}</span>
          </div>
        `).join('');
      }
    }
  }

  function initBreakdownCharts() {
    if (regionChart && projectChart) {
      updateChartsForCurrentScope();
      return;
    }
    const regionCtx = document.getElementById('regionCostChartCanvas');
    const projectCtx = document.getElementById('projectCostChartCanvas');
    const colors = getThemeColors();

    if (regionCtx && typeof Chart !== 'undefined') {
      regionChart = new Chart(regionCtx, {
        type: 'bar',
        data: {
          labels: ['us-central1 (Iowa)', 'us-multi (US)', 'europe-west1 (Belgium)', 'global (Cloud CDN/DNS)'],
          datasets: [{
            label: 'Monthly Spend ($)',
            data: [9250.50, 1620.00, 969.50, 610.00],
            backgroundColor: colors.blue,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => '$' + ctx.parsed.y.toLocaleString() } }
          },
          scales: {
            x: { ticks: { color: colors.textColor, font: { size: 10 } } },
            y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, callback: (v) => '$' + v } }
          }
        }
      });
    }

    if (projectCtx && typeof Chart !== 'undefined') {
      projectChart = new Chart(projectCtx, {
        type: 'bar',
        data: {
          labels: ['HTR Core Production', 'HTR GKE Platform', 'Argolis FinOps Hub', 'HTR Data Warehouse', 'HTR Analytics Prod'],
          datasets: [{
            label: 'Spend by Project ($)',
            data: [5410.00, 3840.50, 1840.00, 1620.00, 1580.00],
            backgroundColor: colors.green,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => '$' + ctx.parsed.y.toLocaleString() } }
          },
          scales: {
            x: { ticks: { color: colors.textColor, font: { size: 10 } } },
            y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, callback: (v) => '$' + v } }
          }
        }
      });
    }
    updateChartsForCurrentScope();
  }

  function updateChartColors() {
    const colors = getThemeColors();
    [trendChart, shareChart, regionChart, projectChart].forEach(chart => {
      if (!chart) return;
      if (chart.options.scales && chart.options.scales.x) {
        chart.options.scales.x.ticks.color = colors.textColor;
      }
      if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.ticks.color = colors.textColor;
        if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = colors.gridColor;
      }
      chart.update();
    });
  }

  function isColorWithAlpha(hexOrRgb, alpha) {
    if (hexOrRgb.startsWith('#')) {
      const r = parseInt(hexOrRgb.slice(1, 3), 16);
      const g = parseInt(hexOrRgb.slice(3, 5), 16);
      const b = parseInt(hexOrRgb.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hexOrRgb;
  }

  // Toggle Stacked Chart Mode
  const toggleStackedBtn = document.getElementById('toggleStackedViewBtn');
  const chartModeLabel = document.getElementById('chartModeLabel');
  if (toggleStackedBtn && chartModeLabel) {
    toggleStackedBtn.addEventListener('click', () => {
      if (!trendChart) return;
      state.chartMode = state.chartMode === 'line' ? 'bar' : 'line';
      trendChart.config.type = state.chartMode;
      
      const isBar = state.chartMode === 'bar';
      trendChart.options.scales.x.stacked = isBar;
      trendChart.options.scales.y.stacked = isBar;
      trendChart.data.datasets.forEach(ds => {
        ds.fill = isBar;
      });

      chartModeLabel.textContent = isBar ? 'Switch to Line' : 'Switch to Stacked';
      trendChart.update();
    });
  }

  // -------------------------------------------------------------
  // Filter Dropdowns Reactions (Scope, BQ Export Table, Date Range, Project, Env)
  // -------------------------------------------------------------
  const scopeSelect = document.getElementById('scopeSelect');
  const bqExportTableSelect = document.getElementById('bqExportTableSelect');
  const uploadBqExportBtn = document.getElementById('uploadBqExportBtn');
  const bqExportFileInput = document.getElementById('bqExportFileInput');
  const uploadBqExportBtnLabel = document.getElementById('uploadBqExportBtnLabel');
  const activeBqExportIndicator = document.getElementById('activeBqExportIndicator');
  const dateRangeSelect = document.getElementById('dateRangeSelect');
  const projectFilterSelect = document.getElementById('projectFilterSelect');
  const envFilterSelect = document.getElementById('envFilterSelect');
  const chartDateSubtitle = document.getElementById('chartDateSubtitle');
  const kpiMtdSpend = document.getElementById('kpiMtdSpend');
  const kpiForecastSpend = document.getElementById('kpiForecastSpend');
  const activeProjectLabel = document.getElementById('activeProjectLabel');
  const scopeModeTitle = document.getElementById('scopeModeTitle');
  const selectAllProjectsBtn = document.getElementById('selectAllProjectsBtn');

  // Organization-Wide Enterprise Billing Rows (Active when Scope === 'org')
  const orgEnterpriseCostRows = [
    {
      service: 'Compute Engine (Org Enterprise Fleet)',
      sku: 'N2/C3 Production Fleet across 38 Org Projects',
      project: 'org-compute-fleet-prod',
      projectName: 'Org Enterprise Compute Fleet (38 Projects)',
      region: 'multi-region (us/eu)',
      env: 'prod',
      usage: '412,000 vCPU-Hours',
      cost: 46850.00,
      trend: '+3.1%',
      trendUp: true
    },
    {
      service: 'Vertex AI & Gemini Enterprise (Org Shared)',
      sku: 'Gemini 2.5 Pro Provisioned Throughput (PTU) & Agents',
      project: 'org-vertex-ai-platform',
      projectName: 'Org Shared AI & Gemini Platform',
      region: 'us-central1',
      env: 'prod',
      usage: '42,500 PTU-Hours',
      cost: 38420.00,
      trend: '+6.4%',
      trendUp: true
    },
    {
      service: 'Google Kubernetes Engine (Org Anthos Fleet)',
      sku: 'Anthos Multi-Cluster Production Fleet (18 Clusters)',
      project: 'org-gke-enterprise-fleet',
      projectName: 'Org Anthos & GKE Platform Fleet',
      region: 'us-east1',
      env: 'prod',
      usage: '240 Nodes (1,920 vCPUs)',
      cost: 24610.60,
      trend: '-2.8%',
      trendUp: false
    },
    {
      service: 'Cloud Spanner (Org Global Databases)',
      sku: 'Multi-Region Enterprise Instance (nam6)',
      project: 'org-spanner-global',
      projectName: 'Org Global Spanner Transactional DB',
      region: 'nam6 (us-central)',
      env: 'prod',
      usage: '12,000 Processing Units',
      cost: 12490.00,
      trend: '+1.2%',
      trendUp: true
    },
    {
      service: 'Chronicle Security & Cloud Armor WAF (Org)',
      sku: 'Enterprise Security Telemetry & Global WAF Protection',
      project: 'org-security-chronicle',
      projectName: 'Org Security & Cloud Armor Command',
      region: 'global',
      env: 'prod',
      usage: '48 TB Telemetry / 180M Reqs',
      cost: 9102.00,
      trend: '-1.5%',
      trendUp: false
    }
  ];

  // Organization-Level Enterprise Recommendations (Active when Scope === 'org')
  const orgExtraRecommendations = [
    {
      id: 'rec-org-1',
      title: 'Organization-Wide 3-Year CUD Sharing Across 45 Projects',
      category: 'commitment',
      impact: 'High',
      project: 'org-argolis-107365563435',
      resource: 'Billing Account 01A4F2-99B1C8-33D1E0 (Org CUD Sharing)',
      savings: 9420.00,
      status: 'pending',
      desc: 'Enable Organization-level Committed Use Discount (CUD) sharing across all 45 child projects to eliminate unutilized commitment silos and capture 57% discount on 412,000 vCPU-Hours.',
      command: 'gcloud beta billing accounts update 01A4F2-99B1C8-33D1E0 --enable-cud-sharing'
    },
    {
      id: 'rec-org-2',
      title: 'Convert Vertex AI Pay-As-You-Go Traffic to Provisioned Throughput (PTU)',
      category: 'commitment',
      impact: 'High',
      project: 'org-vertex-ai-platform',
      resource: 'publishers/google/models/gemini-2.5-pro (us-central1)',
      savings: 3850.00,
      status: 'pending',
      desc: 'Sustained org-wide Gemini 2.5 Pro token velocity exceeds 1.8M TPM across 14 engineering teams. Consolidating into shared Provisioned Throughput reduces cost by 34% and eliminates HTTP 429 throttling.',
      command: 'gcloud ai provisioned-throughputs create org-gemini-ptu --region=us-central1 --model=gemini-2.5-pro --gsus=25'
    },
    {
      id: 'rec-org-3',
      title: 'Enable Autoscale & Node Auto-Provisioning on 12 Org GKE Staging Clusters',
      category: 'rightsizing',
      impact: 'High',
      project: 'org-gke-enterprise-fleet',
      resource: 'org-gke-enterprise-fleet/staging-clusters (12 clusters)',
      savings: 1999.50,
      status: 'pending',
      desc: '12 non-production GKE clusters run 24/7 at <14% memory utilization. Scheduling off-hours scale-down (19:00–07:00) saves $1,999.50/mo.',
      command: 'gcloud container clusters update org-staging-fleet --enable-autosoprovisioning --min-cpu=4 --max-cpu=64'
    }
  ];

  function getTimeMultiplier() {
    const range = dateRangeSelect ? dateRangeSelect.value : '30';
    if (range === '7') return 7 / 30;
    if (range === '90') return 2.85;
    if (range === '365') return 9.4;
    return 1.0;
  }

  function getSelectedScopeProjects() {
    const scope = scopeSelect ? scopeSelect.value : 'multi';
    const allCheckboxes = Array.from(document.querySelectorAll('.proj-scope-cb'));
    if (scope === 'single') {
      const singleProj = (projectFilterSelect && projectFilterSelect.value !== 'all' && projectFilterSelect.value !== 'org')
        ? projectFilterSelect.value
        : 'argolis-finops-hub-14419';
      if (projectFilterSelect && (projectFilterSelect.value === 'all' || projectFilterSelect.value === 'org')) {
        projectFilterSelect.value = singleProj;
      }
      allCheckboxes.forEach(cb => { cb.checked = (cb.value === singleProj); });
      return [singleProj];
    } else if (scope === 'org') {
      if (projectFilterSelect) projectFilterSelect.value = 'org';
      allCheckboxes.forEach(cb => { cb.checked = true; });
      return allCheckboxes.map(cb => cb.value);
    } else {
      // 'multi' — Multiple Selected Projects
      if (projectFilterSelect && projectFilterSelect.value === 'org') {
        projectFilterSelect.value = 'all';
      }
      const checked = allCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
      if (checked.length === 0 && allCheckboxes.length > 0) {
        // Default to the 5 core production/analytics projects
        allCheckboxes.slice(0, 5).forEach(cb => { cb.checked = true; });
        return allCheckboxes.slice(0, 5).map(cb => cb.value);
      }
      return checked;
    }
  }

  function getScopedServiceRows() {
    const scope = scopeSelect ? scopeSelect.value : 'multi';
    const selectedProjects = getSelectedScopeProjects();
    const env = envFilterSelect ? envFilterSelect.value : 'all';
    const timeMult = getTimeMultiplier();

    const basePool = scope === 'org'
      ? [...serviceCostData, ...orgEnterpriseCostRows]
      : serviceCostData;

    return basePool
      .filter(item => {
        const envMatch = env === 'all' || !item.env || item.env === env;
        if (scope === 'org') return envMatch;
        return envMatch && selectedProjects.includes(item.project);
      })
      .map(item => ({
        ...item,
        projectDisplayName: item.projectName || getProjectDisplayName(item.project),
        projectShortName: item.projectName || getProjectShortName(item.project),
        cost: Number((item.cost * timeMult).toFixed(2))
      }));
  }

  function getActiveRecommendations() {
    const scope = scopeSelect ? scopeSelect.value : 'multi';
    const selectedProjects = getSelectedScopeProjects();
    const pool = scope === 'org'
      ? [...orgExtraRecommendations, ...recommendations]
      : recommendations.filter(r => scope === 'org' || selectedProjects.includes(r.project) || (scope === 'multi' && r.project === 'htr-dev-service'));
    return pool;
  }

  function updateChartsForCurrentScope() {
    const scope = scopeSelect ? scopeSelect.value : 'multi';
    const rows = getScopedServiceRows();
    const totalSpend = rows.reduce((sum, r) => sum + r.cost, 0);
    const baselineRatio = totalSpend > 0 ? (totalSpend / 14290.50) : 1.0;

    // 1. Update Daily Cost Trend Chart
    if (trendChart && trendChart.data && trendChart.data.datasets) {
      const baseSeries = [
        [175, 182, 178, 185, 190, 184, 188, 192, 195, 186, 180], // Compute
        [120, 125, 130, 145, 150, 140, 142, 148, 155, 135, 128], // GKE
        [54,  54,  55,  55,  56,  55,  55,  54,  55,  54,  54],   // Storage
        [45,  50,  48,  62,  55,  48,  52,  60,  58,  50,  52]    // BigQuery / AI
      ];
      trendChart.data.datasets.forEach((ds, idx) => {
        if (baseSeries[idx]) {
          ds.data = baseSeries[idx].map(v => Number((v * baselineRatio).toFixed(2)));
        }
      });
      if (scope === 'org' && trendChart.data.datasets[3]) {
        trendChart.data.datasets[3].label = 'BigQuery & Vertex AI (Org)';
      } else if (trendChart.data.datasets[3]) {
        trendChart.data.datasets[3].label = 'BigQuery Analytics';
      }
      trendChart.update();
    }

    // 2. Update Cost by Cloud Service Donut Chart & Custom Legend
    if (shareChart && shareChart.data) {
      const byService = {};
      rows.forEach(r => {
        const key = r.service.split(' (')[0];
        byService[key] = (byService[key] || 0) + r.cost;
      });
      const sortedServices = Object.entries(byService).sort((a, b) => b[1] - a[1]);
      const top5 = sortedServices.slice(0, 5);
      const otherSum = sortedServices.slice(5).reduce((s, x) => s + x[1], 0);
      if (otherSum > 0) top5.push(['Other Services', Number(otherSum.toFixed(2))]);

      const labels = top5.map(x => x[0]);
      const values = top5.map(x => Number(x[1].toFixed(2)));
      shareChart.data.labels = labels;
      shareChart.data.datasets[0].data = values;
      shareChart.update();

      const legendContainer = document.getElementById('serviceShareLegend');
      const palette = shareChart.data.datasets[0].backgroundColor || ['#1a73e8', '#9334e6', '#1e8e3e', '#f9ab00', '#00acc1', '#78909c'];
      if (legendContainer) {
        legendContainer.innerHTML = labels.map((lbl, i) => {
          const val = values[i] || 0;
          const pct = totalSpend > 0 ? ((val / totalSpend) * 100).toFixed(1) : '0.0';
          return `
            <div class="legend-item">
              <div class="legend-label-wrap">
                <span class="legend-color-box" style="background-color: ${palette[i % palette.length]}"></span>
                <span style="color: var(--text-secondary);">${escapeHtml(lbl)}</span>
              </div>
              <span class="legend-val">$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${pct}%)</span>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Update Cost Breakdown Region & Project Charts if initialized
    if (regionChart && regionChart.data) {
      const byRegion = {};
      rows.forEach(r => {
        byRegion[r.region] = (byRegion[r.region] || 0) + r.cost;
      });
      const regEntries = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
      regionChart.data.labels = regEntries.map(e => e[0]);
      regionChart.data.datasets[0].data = regEntries.map(e => Number(e[1].toFixed(2)));
      regionChart.update();
    }

    if (projectChart && projectChart.data) {
      const byProj = {};
      rows.forEach(r => {
        const label = getProjectShortName(r.project);
        byProj[label] = (byProj[label] || 0) + r.cost;
      });
      const projEntries = Object.entries(byProj).sort((a, b) => b[1] - a[1]);
      projectChart.data.labels = projEntries.map(e => e[0]);
      projectChart.data.datasets[0].data = projEntries.map(e => Number(e[1].toFixed(2)));
      projectChart.update();
    }
  }

  function handleFilterChange() {
    const scope = scopeSelect ? scopeSelect.value : 'multi';
    const range = dateRangeSelect ? dateRangeSelect.value : '30';
    const selectedProjects = getSelectedScopeProjects();
    const activeProjectIcon = document.getElementById('activeProjectIcon');

    // Update Scope Mode UI Title & Dropdown Option Label
    if (scopeModeTitle) {
      if (scope === 'single') {
        const pInfo = PROJECT_DIRECTORY[selectedProjects[0]];
        const disp = pInfo ? `${pInfo.name} (${pInfo.id})` : selectedProjects[0];
        scopeModeTitle.textContent = `Granular Scope — Single Project: ${disp}`;
      } else if (scope === 'org') {
        scopeModeTitle.textContent = 'Granular Scope — Entire Organization: Argolis FinOps Org (org-argolis-107365563435 • 45+ Projects)';
      } else {
        scopeModeTitle.textContent = `Granular Scope — Multiple Selected Projects (${selectedProjects.length} Active Projects):`;
      }
    }

    const multiOpt = scopeSelect ? scopeSelect.querySelector('option[value="multi"]') : null;
    if (multiOpt) {
      multiOpt.textContent = `📁 Scope: Multiple Selected Projects (${selectedProjects.length})`;
    }

    // Update Top Header Project Selector Label & Icon with Human-Readable Project Name
    if (activeProjectLabel) {
      if (scope === 'org') {
        activeProjectLabel.textContent = 'Organization: Argolis FinOps Org (45+ Projects)';
        if (activeProjectIcon) activeProjectIcon.textContent = 'domain';
      } else if (scope === 'single') {
        const pInfo = PROJECT_DIRECTORY[selectedProjects[0]];
        activeProjectLabel.textContent = pInfo ? `${pInfo.name} (${pInfo.id})` : selectedProjects[0];
        if (activeProjectIcon) activeProjectIcon.textContent = pInfo ? pInfo.icon : 'folder';
      } else {
        activeProjectLabel.textContent = `Multiple Projects (${selectedProjects.length} Selected)`;
        if (activeProjectIcon) activeProjectIcon.textContent = 'folder_shared';
      }
    }

    // Dynamic date range subtitle
    if (range === '7') {
      if (chartDateSubtitle) chartDateSubtitle.textContent = '(Last 7 Days — Sep 15 - Sep 21, 2026)';
    } else if (range === '90') {
      if (chartDateSubtitle) chartDateSubtitle.textContent = '(Last 90 Days — Jun 23 - Sep 21, 2026)';
    } else if (range === '365') {
      if (chartDateSubtitle) chartDateSubtitle.textContent = '(YTD — Jan 01 - Sep 21, 2026)';
    } else {
      if (chartDateSubtitle) chartDateSubtitle.textContent = '(Last 30 Days — Aug 22 - Sep 21, 2026)';
    }

    // Compute exact scoped spend from getScopedServiceRows() so KPI 1 & Cost Breakdown Table match 100%
    const scopedRows = getScopedServiceRows();
    const calculatedSpend = scopedRows.reduce((acc, item) => acc + item.cost, 0);
    const calculatedForecast = Number((calculatedSpend * 1.079).toFixed(2));
    const timeMult = getTimeMultiplier();

    // Determine target budget & health score based on Scope (Org vs Single vs Multi)
    let targetBudget = 18000.00 * timeMult;
    let healthScore = 88;
    let healthBadge = '+4 pts';
    let healthSubtext = '94% resources tagged with env/team';
    let spendSubtext = `vs. previous period (${selectedProjects.length} Projects)`;

    if (scope === 'org') {
      targetBudget = 165000.00 * timeMult;
      healthScore = 92;
      healthBadge = '+6 pts (Org CUD)';
      healthSubtext = '97% Org Policy & CUD coverage across 45+ projects';
      spendSubtext = 'Across 45+ Projects in Argolis FinOps Org';
    } else if (scope === 'single') {
      const pInfo = PROJECT_DIRECTORY[selectedProjects[0]];
      targetBudget = (pInfo ? pInfo.budget : 3500.00) * timeMult;
      healthScore = selectedProjects[0] === 'argolis-finops-hub-14419' ? 96 : 89;
      healthBadge = '+5 pts';
      healthSubtext = `Project: ${pInfo ? pInfo.name : selectedProjects[0]} (${pInfo ? pInfo.env : 'Prod'})`;
      spendSubtext = `Project: ${pInfo ? pInfo.name : selectedProjects[0]}`;
    }

    const budgetPct = targetBudget > 0 ? Math.min(100, Number(((calculatedForecast / targetBudget) * 100).toFixed(1))) : 85.0;

    if (kpiMtdSpend) {
      kpiMtdSpend.textContent = '$' + calculatedSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const kpiSpendSubtext = document.getElementById('kpiSpendSubtext');
    if (kpiSpendSubtext) {
      kpiSpendSubtext.textContent = spendSubtext;
    }

    if (kpiForecastSpend) {
      kpiForecastSpend.textContent = '$' + calculatedForecast.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const kpiForecastMetaBadge = document.getElementById('kpiForecastMetaBadge');
    if (kpiForecastMetaBadge) {
      kpiForecastMetaBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size: 15px;">check</span> ${budgetPct}% of budget`;
    }
    const kpiForecastThresholdText = document.getElementById('kpiForecastThresholdText');
    if (kpiForecastThresholdText) {
      kpiForecastThresholdText.textContent = `($${targetBudget.toLocaleString('en-US', { maximumFractionDigits: 0 })} threshold)`;
    }
    const kpiForecastProgressFill = document.getElementById('kpiForecastProgressFill');
    if (kpiForecastProgressFill) {
      kpiForecastProgressFill.style.width = `${budgetPct}%`;
    }

    const kpiHealthScore = document.getElementById('kpiHealthScore');
    if (kpiHealthScore) kpiHealthScore.textContent = `${healthScore}%`;
    const kpiHealthMetaBadge = document.getElementById('kpiHealthMetaBadge');
    if (kpiHealthMetaBadge) kpiHealthMetaBadge.textContent = healthBadge;
    const kpiHealthMetaText = document.getElementById('kpiHealthMetaText');
    if (kpiHealthMetaText) kpiHealthMetaText.textContent = healthSubtext;
    const kpiHealthProgressFill = document.getElementById('kpiHealthProgressFill');
    if (kpiHealthProgressFill) kpiHealthProgressFill.style.width = `${healthScore}%`;

    // Update SQL Studio WHERE clause to reflect active BigQuery Export & Consumption Scope
    const selectedTable = bqExportTableSelect ? bqExportTableSelect.value : 'gcp_billing_export_v1';
    const sqlArea = document.getElementById('sqlQueryTextarea');
    if (sqlArea) {
      const whereScope = scope === 'org'
        ? `/* Scope: Entire Organization (Argolis FinOps Org • 107365563435 • 45+ Projects) */`
        : scope === 'single'
          ? `AND project.id = '${selectedProjects[0]}' /* ${getProjectShortName(selectedProjects[0])} */`
          : `AND project.id IN (${selectedProjects.map(p => `'${p}'`).join(', ')})`;
      sqlArea.value =
        `/* BigQuery Billing Export: argolis-finops-hub-14419.finops_billing_analytics.${selectedTable} */\n` +
        `SELECT\n  project.id AS project_id,\n  project.name AS project_name,\n  service.description AS service_name,\n  sku.description AS sku_description,\n  ROUND(SUM(cost_usd), 2) AS total_cost_usd\n` +
        `FROM \`argolis-finops-hub-14419.finops_billing_analytics.${selectedTable}\`\n` +
        `WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${range} DAY)\n` +
        `  ${whereScope}\n` +
        `GROUP BY 1, 2, 3, 4\nORDER BY total_cost_usd DESC\nLIMIT 25;`;
    }

    updateSavingsMetrics();
    renderRecommendations();
    renderQuickRecList();
    renderServiceTable();
    updateChartsForCurrentScope();

    const scopeLabel = scope === 'org'
      ? 'Entire Organization (Argolis FinOps Org)'
      : scope === 'single'
        ? getProjectDisplayName(selectedProjects[0])
        : `Multiple Projects (${selectedProjects.length})`;
    showSnackbar(`Active Scope: ${scopeLabel} | Total Spend: $${calculatedSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  async function handleBqTableChange() {
    const selectedTable = bqExportTableSelect ? bqExportTableSelect.value : 'gcp_billing_export_v1';
    if (bqTableCatalog[selectedTable]) {
      serviceCostData = [...bqTableCatalog[selectedTable]];
    }
    if (activeBqExportIndicator) {
      activeBqExportIndicator.textContent = `argolis-finops-hub-14419.finops_billing_analytics.${selectedTable}`;
    }

    // Attempt live sync from BigQuery REST API on argolis-finops-hub-14419
    try {
      const res = await fetch('/api/bq/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          scope: scopeSelect ? scopeSelect.value : 'multi',
          projects: getSelectedScopeProjects()
        })
      });
      const bqJson = await res.json();
      if (bqJson && bqJson.live_bigquery && Array.isArray(bqJson.rows) && bqJson.rows.length > 0) {
        serviceCostData = bqJson.rows;
      }
    } catch (_) {
      // Keep local catalog if offline
    }

    handleFilterChange();
  }

  // Wire up Scope, Date, Project, Env & Multi-Project Checkboxes
  if (scopeSelect) {
    scopeSelect.addEventListener('change', () => {
      const sc = scopeSelect.value;
      if (sc === 'single' && projectFilterSelect && (projectFilterSelect.value === 'all' || projectFilterSelect.value === 'org')) {
        projectFilterSelect.value = 'argolis-finops-hub-14419';
      } else if (sc === 'org' && projectFilterSelect) {
        projectFilterSelect.value = 'org';
      } else if (sc === 'multi' && projectFilterSelect) {
        projectFilterSelect.value = 'all';
      }
      handleFilterChange();
    });
  }

  if (projectFilterSelect) {
    projectFilterSelect.addEventListener('change', () => {
      const val = projectFilterSelect.value;
      if (val === 'org') {
        if (scopeSelect) scopeSelect.value = 'org';
      } else if (val === 'all') {
        if (scopeSelect) scopeSelect.value = 'multi';
      } else {
        if (scopeSelect) scopeSelect.value = 'single';
      }
      handleFilterChange();
    });
  }

  [dateRangeSelect, envFilterSelect].forEach(select => {
    if (select) select.addEventListener('change', handleFilterChange);
  });

  document.querySelectorAll('.proj-scope-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const checkedCount = document.querySelectorAll('.proj-scope-cb:checked').length;
      if (scopeSelect) {
        scopeSelect.value = checkedCount === 1 ? 'single' : 'multi';
        if (checkedCount === 1 && projectFilterSelect) {
          const onlyChecked = document.querySelector('.proj-scope-cb:checked');
          if (onlyChecked) projectFilterSelect.value = onlyChecked.value;
        } else if (projectFilterSelect) {
          projectFilterSelect.value = 'all';
        }
      }
      handleFilterChange();
    });
  });

  if (selectAllProjectsBtn) {
    selectAllProjectsBtn.addEventListener('click', () => {
      document.querySelectorAll('.proj-scope-cb').forEach(cb => { cb.checked = true; });
      if (scopeSelect) scopeSelect.value = 'multi';
      if (projectFilterSelect) projectFilterSelect.value = 'all';
      handleFilterChange();
    });
  }

  if (bqExportTableSelect) {
    bqExportTableSelect.addEventListener('change', handleBqTableChange);
  }

  // Wire up Local BigQuery Export File (.csv / .json) Picker
  if (uploadBqExportBtn && bqExportFileInput) {
    uploadBqExportBtn.addEventListener('click', () => bqExportFileInput.click());
    bqExportFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = String(ev.target.result || '');
          let parsedRows = [];
          if (file.name.endsWith('.json')) {
            const arr = JSON.parse(content);
            if (Array.isArray(arr)) parsedRows = arr;
          } else {
            const lines = content.trim().split('\n').slice(1);
            parsedRows = lines.map(line => {
              const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
              return {
                service: cols[0] || 'Custom BQ Service',
                sku: cols[1] || 'Exported SKU',
                project: cols[2] || 'argolis-finops-hub-14419',
                region: cols[3] || 'us-central1',
                env: 'prod',
                usage: cols[4] || '100 Units',
                cost: parseFloat(cols[5]) || 450.00,
                trend: cols[6] || '-2.5%',
                trendUp: false
              };
            }).filter(r => r.service);
          }
          if (parsedRows.length > 0) {
            serviceCostData = parsedRows;
          }
          if (uploadBqExportBtnLabel) uploadBqExportBtnLabel.textContent = file.name;
          if (activeBqExportIndicator) activeBqExportIndicator.textContent = `Custom File: ${file.name}`;
          handleFilterChange();
          showSnackbar(`Loaded BigQuery Export file: ${file.name} (${serviceCostData.length} records)`);
        } catch (err) {
          showSnackbar(`Loaded BigQuery Export metadata for: ${file.name}`);
        }
      };
      reader.readAsText(file);
    });
  }

  // -------------------------------------------------------------
  // Recommender Hub & Dynamic Actions (Scoped by Single / Multi / Org)
  // -------------------------------------------------------------
  const recommendationsContainer = document.getElementById('recommendationsListContainer');
  const recommenderTotalSavingsBadge = document.getElementById('recommenderTotalSavingsBadge');
  const kpiSavingsVal = document.getElementById('kpiSavingsVal');
  const kpiRecCountText = document.getElementById('kpiRecCountText');
  const recBadgeCount = document.getElementById('recBadgeCount');
  const overviewQuickRecList = document.getElementById('overviewQuickRecList');

  let activeCategory = 'all';

  function updateSavingsMetrics() {
    const activeRecs = getActiveRecommendations();
    const pendingRecs = activeRecs.filter(r => r.status === 'pending');
    const totalPotential = pendingRecs.reduce((sum, r) => sum + r.savings, 0);
    const count = pendingRecs.length;

    const formattedSavings = '+$' + totalPotential.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' / mo';
    if (recommenderTotalSavingsBadge) recommenderTotalSavingsBadge.textContent = formattedSavings;
    if (kpiSavingsVal) kpiSavingsVal.innerHTML = `$${totalPotential.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span style="font-size: 14px; font-weight: normal; color: var(--text-secondary);">/mo</span>`;
    if (kpiRecCountText) kpiRecCountText.textContent = `${count} recommendations ready`;
    if (recBadgeCount) recBadgeCount.textContent = count;
  }

  function renderRecommendations() {
    if (!recommendationsContainer) return;

    const filterStatus = document.getElementById('recStatusFilter')?.value || 'all';
    const activeRecs = getActiveRecommendations();

    const filtered = activeRecs.filter(rec => {
      const matchCat = activeCategory === 'all' || rec.category === activeCategory;
      const matchStatus = filterStatus === 'all' ||
                          (filterStatus === 'pending' && rec.status === 'pending') ||
                          (filterStatus === 'applied' && rec.status === 'applied');
      return matchCat && matchStatus;
    });

    if (filtered.length === 0) {
      recommendationsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--google-green);">check_circle</span>
          <div style="font-weight: 500; font-size: 15px; margin-top: 8px;">All recommendations applied for this scope &amp; category!</div>
        </div>
      `;
      return;
    }

    recommendationsContainer.innerHTML = filtered.map(rec => {
      const isApplied = rec.status === 'applied';
      const projDisplay = getProjectDisplayName(rec.project);
      return `
        <div class="rec-card-item ${isApplied ? 'applied' : ''}" id="card-${rec.id}">
          <div class="rec-top">
            <div class="rec-header-info">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="status-pill ${rec.impact === 'High' ? 'danger' : 'warning'}">
                  ${rec.impact} Impact
                </span>
                <span class="code-pill" title="Project ID: ${escapeHtml(rec.project)}"><strong>${escapeHtml(projDisplay)}</strong></span>
                <span style="font-size: 11px; color: var(--text-tertiary); text-transform: capitalize;">• ${rec.category}</span>
              </div>
              <h3 class="rec-title">${rec.title}</h3>
              <div class="rec-resource">Resource: <code>${rec.resource}</code></div>
            </div>
            <div class="rec-savings-badge">
              +$${rec.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
            </div>
          </div>
          <p class="rec-desc">${rec.desc}</p>
          <div class="rec-actions">
            <button class="btn-gcp btn-gcp-subtle btn-copy-cmd" data-cmd="${escapeHtml(rec.command)}">
              <span class="material-symbols-outlined" style="font-size: 16px;">terminal</span>
              <span>Copy gcloud</span>
            </button>
            ${isApplied ? `
              <span class="status-pill success">
                <span class="material-symbols-outlined" style="font-size: 14px;">check</span>
                <span>Applied</span>
              </span>
            ` : `
              <button class="btn-gcp btn-gcp-primary btn-apply-rec" data-id="${rec.id}">
                <span class="material-symbols-outlined" style="font-size: 16px;">check</span>
                <span>Apply Optimization</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    attachRecListeners();
  }

  function renderQuickRecList() {
    if (!overviewQuickRecList) return;
    const top3 = getActiveRecommendations().filter(r => r.status === 'pending').slice(0, 3);
    overviewQuickRecList.innerHTML = top3.map(rec => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background-color: var(--bg-surface-variant);">
        <div>
          <div style="font-weight: 500; font-size: 13px;">${rec.title}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(getProjectDisplayName(rec.project))} • <strong>+$${rec.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</strong></div>
        </div>
        <button class="btn-gcp btn-gcp-primary btn-apply-rec" data-id="${rec.id}" style="height: 28px; padding: 0 10px; font-size: 11px;">
          Apply
        </button>
      </div>
    `).join('');
    attachRecListeners();
  }

  function attachRecListeners() {
    document.querySelectorAll('.btn-apply-rec').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        applyRecommendation(id);
      };
    });

    document.querySelectorAll('.btn-apply-quick-rec').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-rec-id');
        applyRecommendation(id);
      };
    });

    document.querySelectorAll('.btn-copy-cmd').forEach(btn => {
      btn.onclick = () => {
        const cmd = btn.getAttribute('data-cmd');
        navigator.clipboard.writeText(cmd).then(() => {
          showSnackbar('Copied gcloud command to clipboard.');
        });
      };
    });
  }

  function applyRecommendation(id) {
    const allPool = [...orgExtraRecommendations, ...recommendations];
    const target = allPool.find(r => r.id === id);
    if (!target || target.status === 'applied') return;

    target.status = 'applied';
    state.lastAppliedRec = target;

    updateSavingsMetrics();
    renderRecommendations();
    renderQuickRecList();

    showSnackbar(
      `Applied fix for ${target.title}. Monthly run rate reduced by $${target.savings.toFixed(2)}.`,
      'UNDO',
      () => {
        target.status = 'pending';
        updateSavingsMetrics();
        renderRecommendations();
        renderQuickRecList();
        showSnackbar(`Reverted recommendation ${target.title}.`);
      }
    );
  }

  // Category filter chips
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.getAttribute('data-category');
      renderRecommendations();
    });
  });

  const recStatusFilter = document.getElementById('recStatusFilter');
  if (recStatusFilter) {
    recStatusFilter.addEventListener('change', renderRecommendations);
  }

  // -------------------------------------------------------------
  // Cost Breakdown Table (Scoped by Single / Multi / Org)
  // -------------------------------------------------------------
  const serviceTableBody = document.getElementById('serviceTableBody');
  const tableTotalCostCell = document.getElementById('tableTotalCostCell');
  const tableFilterInput = document.getElementById('tableFilterInput');

  function renderServiceTable() {
    if (!serviceTableBody) return;
    const query = tableFilterInput ? tableFilterInput.value.toLowerCase().trim() : '';

    let data = getScopedServiceRows().filter(item => {
      return item.service.toLowerCase().includes(query) ||
             item.sku.toLowerCase().includes(query) ||
             item.project.toLowerCase().includes(query) ||
             (item.projectDisplayName && item.projectDisplayName.toLowerCase().includes(query));
    });

    // Sort
    data.sort((a, b) => {
      let valA = a[state.sortCol];
      let valB = b[state.sortCol];
      if (typeof valA === 'string') {
        return state.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return state.sortDir === 'asc' ? valA - valB : valB - valA;
    });

    const totalCost = data.reduce((sum, item) => sum + item.cost, 0);

    serviceTableBody.innerHTML = data.map(item => {
      const pctShare = totalCost > 0 ? ((item.cost / totalCost) * 100).toFixed(1) : '0.0';
      const projShort = item.projectShortName || getProjectShortName(item.project);
      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.service)}</strong>
            <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(item.sku)}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 12px; color: var(--text-primary);">${escapeHtml(projShort)}</div>
            <code style="font-size: 11px;">${escapeHtml(item.project)}</code>
          </td>
          <td><span class="code-pill">${escapeHtml(item.region)}</span></td>
          <td>${escapeHtml(item.usage)}</td>
          <td class="amount mono-cell">$${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="amount">${pctShare}%</td>
          <td>
            <span class="status-pill ${item.trendUp ? 'danger' : 'success'}">
              ${escapeHtml(item.trend)}
            </span>
          </td>
          <td>
            <button class="btn-gcp btn-gcp-subtle btn-inspect-service" data-service="${escapeHtml(item.service)}">
              <span class="material-symbols-outlined" style="font-size: 16px;">search</span>
              <span>Inspect</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (tableTotalCostCell) {
      tableTotalCostCell.textContent = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Inspect service triggers
    document.querySelectorAll('.btn-inspect-service').forEach(btn => {
      btn.onclick = () => {
        const sName = btn.getAttribute('data-service');
        const activeTable = bqExportTableSelect ? bqExportTableSelect.value : 'gcp_billing_export_v1';
        switchTab('bigquery');
        const sqlArea = document.getElementById('sqlQueryTextarea');
        if (sqlArea) {
          sqlArea.value = `/* Inspected Query for Service: ${sName} */\nSELECT * FROM \`argolis-finops-hub-14419.finops_billing_analytics.${activeTable}\` WHERE service_name = '${sName}' LIMIT 50;`;
        }
        showSnackbar(`Loaded BigQuery inspect query for ${sName}.`);
      };
    });
  }

  if (tableFilterInput) {
    tableFilterInput.addEventListener('input', renderServiceTable);
  }

  // Sortable headers
  document.querySelectorAll('.table-gcp th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-col');
      if (state.sortCol === col) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortCol = col;
        state.sortDir = 'desc';
      }
      renderServiceTable();
    });
  });

  // -------------------------------------------------------------
  // BigQuery SQL Studio & Query Runner
  // -------------------------------------------------------------
  const sqlPresetSelect = document.getElementById('sqlPresetSelect');
  const sqlQueryTextarea = document.getElementById('sqlQueryTextarea');
  const runSqlQueryBtn = document.getElementById('runSqlQueryBtn');
  const copySqlQueryBtn = document.getElementById('copySqlQueryBtn');
  const queryResultsTable = document.getElementById('queryResultsTable');
  const queryResultsHeader = document.getElementById('queryResultsHeader');
  const downloadQueryResultsBtn = document.getElementById('downloadQueryResultsBtn');

  function loadSqlPreset(presetKey) {
    if (sqlQueryTextarea && sqlPresets[presetKey]) {
      sqlQueryTextarea.value = sqlPresets[presetKey];
    }
  }

  function renderQueryResults(presetKey) {
    if (!queryResultsTable) return;
    const data = sampleQueryResults[presetKey] || sampleQueryResults.topServices;

    const thead = `
      <thead>
        <tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr>
      </thead>
    `;
    const tbody = `
      <tbody>
        ${data.rows.map(row => `
          <tr>${row.map((cell, idx) => `<td class="${idx >= 3 ? 'mono-cell' : ''}">${cell}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    `;

    queryResultsTable.innerHTML = thead + tbody;
    if (queryResultsHeader) {
      queryResultsHeader.textContent = `Query Results (${data.rows.length} rows returned from argolis-finops-hub-14419 in 184ms)`;
    }
  }

  if (sqlPresetSelect) {
    sqlPresetSelect.addEventListener('change', () => {
      loadSqlPreset(sqlPresetSelect.value);
    });
  }

  if (runSqlQueryBtn) {
    runSqlQueryBtn.addEventListener('click', () => {
      runSqlQueryBtn.disabled = true;
      runSqlQueryBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">autorenew</span> Running...`;
      setTimeout(() => {
        runSqlQueryBtn.disabled = false;
        runSqlQueryBtn.innerHTML = `<span class="material-symbols-outlined">play_arrow</span> Run Query`;
        const key = sqlPresetSelect ? sqlPresetSelect.value : 'topServices';
        renderQueryResults(key);
        showSnackbar('BigQuery query executed on argolis-finops-hub-14419.');
      }, 300);
    });
  }

  if (copySqlQueryBtn && sqlQueryTextarea) {
    copySqlQueryBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(sqlQueryTextarea.value).then(() => {
        showSnackbar('BigQuery SQL copied to clipboard.');
      });
    });
  }

  if (downloadQueryResultsBtn) {
    downloadQueryResultsBtn.addEventListener('click', () => {
      exportCsvFile('bigquery_finops_results.csv', [
        ['Service Name', 'SKU Description', 'Project ID', 'Region', 'Total Cost USD', 'Usage'],
        ...serviceCostData.map(s => [s.service, s.sku, s.project, s.region, s.cost.toFixed(2), s.usage])
      ]);
      showSnackbar('Downloaded BigQuery export results CSV.');
    });
  }

  // -------------------------------------------------------------
  // Gemini FinOps Copilot Interactive Engine (Vertex AI Connected)
  // -------------------------------------------------------------
  const geminiChatMessagesArea = document.getElementById('geminiChatMessagesArea');
  const geminiChatInputField = document.getElementById('geminiChatInputField');
  const geminiSendBtn = document.getElementById('geminiSendBtn');

  function formatSafeMarkdown(rawText) {
    const safe = escapeHtml(String(rawText || ''));
    return safe
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  function addChatMessage(content, isUser = false) {
    if (!geminiChatMessagesArea) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-bubble ${isUser ? 'user' : 'gemini'}`;
    msgDiv.innerHTML = content;
    geminiChatMessagesArea.appendChild(msgDiv);
    geminiChatMessagesArea.scrollTop = geminiChatMessagesArea.scrollHeight;
  }

  async function handleGeminiQuery(query) {
    if (!query || !query.trim()) return;
    const text = query.trim();
    addChatMessage(`<p>${escapeHtml(text)}</p>`, true);
    if (geminiChatInputField) geminiChatInputField.value = '';

    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-bubble gemini';
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary);"><span class="material-symbols-outlined" style="font-size: 16px; animation: spin 1s linear infinite;">autorenew</span> Vertex AI (gemini-2.5-flash @ argolis-finops-hub-14419) is analyzing...</span>`;
    geminiChatMessagesArea.appendChild(loadingDiv);
    geminiChatMessagesArea.scrollTop = geminiChatMessagesArea.scrollHeight;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          context: {
            scope: scopeSelect ? scopeSelect.value : 'multi',
            bqTable: bqExportTableSelect ? bqExportTableSelect.value : 'gcp_billing_export_v1',
            selectedProjects: getSelectedScopeProjects(),
            mtdSpend: kpiMtdSpend ? kpiMtdSpend.textContent : '$14,290.50'
          }
        })
      });
      const data = await res.json();
      
      const el = document.getElementById(loadingId);
      if (el) el.remove();

      if (data && data.reply) {
        const badgeHtml = data.live_vertex
          ? `<div style="margin-bottom: 6px;"><span class="status-pill success" style="font-size: 10px;">⚡ Live Vertex AI (${escapeHtml(data.model || 'gemini-2.5-flash')} • ${escapeHtml(data.project_id || 'argolis-finops-hub-14419')})</span></div>`
          : `<div style="margin-bottom: 6px;"><span class="status-pill info" style="font-size: 10px;">FinOps Intelligence Engine</span></div>`;
        addChatMessage(`${badgeHtml}<p>${formatSafeMarkdown(data.reply)}</p>`, false);
      } else {
        addChatMessage('<p>Unable to fetch Vertex AI response. Please verify network connection.</p>', false);
      }
    } catch (err) {
      const el = document.getElementById(loadingId);
      if (el) el.remove();
      addChatMessage(`<p>Error communicating with Vertex AI backend: ${escapeHtml(err.message)}</p>`, false);
    }
  }

  if (geminiSendBtn && geminiChatInputField) {
    geminiSendBtn.addEventListener('click', () => {
      handleGeminiQuery(geminiChatInputField.value);
    });

    geminiChatInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleGeminiQuery(geminiChatInputField.value);
      }
    });
  }

  // Quick chip triggers
  document.querySelectorAll('.quick-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) handleGeminiQuery(prompt);
    });
  });

  // -------------------------------------------------------------
  // Wire All Remaining Header & View Buttons (100% Interactive Coverage)
  // -------------------------------------------------------------
  const projectSelectorBtn = document.getElementById('projectSelectorBtn');
  const projectPickerDropdown = document.getElementById('projectPickerDropdown');
  const projectPickerSearchInput = document.getElementById('projectPickerSearchInput');
  const projectPickerList = document.getElementById('projectPickerList');

  function renderProjectPickerList(filterQuery = '') {
    if (!projectPickerList) return;
    const q = filterQuery.toLowerCase().trim();
    const currentScope = scopeSelect ? scopeSelect.value : 'multi';
    const currentProj = projectFilterSelect ? projectFilterSelect.value : 'all';

    const entries = Object.values(PROJECT_DIRECTORY).filter(item => {
      if (!q) return true;
      return item.name.toLowerCase().includes(q) ||
             item.id.toLowerCase().includes(q) ||
             (item.orgId && item.orgId.toLowerCase().includes(q)) ||
             item.env.toLowerCase().includes(q) ||
             item.folder.toLowerCase().includes(q);
    });

    if (entries.length === 0) {
      projectPickerList.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 12px;">No projects matching "${escapeHtml(filterQuery)}"</div>`;
      return;
    }

    projectPickerList.innerHTML = entries.map(item => {
      const isSelected = (item.id === 'org' && currentScope === 'org') ||
                         (item.id === 'multi' && currentScope === 'multi') ||
                         (currentScope === 'single' && currentProj === item.id);
      const badgeColor = item.env === 'Organization' ? 'var(--google-purple)' :
                         item.env === 'Multi-Project' ? 'var(--google-blue)' :
                         item.env === 'Production' ? 'var(--google-green)' :
                         item.env === 'Staging' ? 'var(--google-yellow)' : 'var(--text-secondary)';
      const displayId = item.orgId || item.id;
      return `
        <div class="project-picker-item" data-pick-id="${escapeHtml(item.id)}" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; border: 1px solid ${isSelected ? 'var(--google-blue)' : 'transparent'}; background: ${isSelected ? 'rgba(26, 115, 232, 0.08)' : 'transparent'}; margin-bottom: 4px; transition: background 0.15s;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--google-blue);">${escapeHtml(item.icon)}</span>
            <div style="min-width: 0;">
              <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>${escapeHtml(item.name)}</span>
                ${isSelected ? `<span class="material-symbols-outlined" style="font-size: 15px; color: var(--google-blue);">check_circle</span>` : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                <code>${escapeHtml(displayId)}</code> • ${escapeHtml(item.folder)}
              </div>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); font-family: 'Roboto Mono', monospace;">$${item.spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</div>
            <span style="font-size: 10px; font-weight: 600; color: ${badgeColor};">${escapeHtml(item.env)}</span>
          </div>
        </div>
      `;
    }).join('');

    projectPickerList.querySelectorAll('.project-picker-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const pickedId = el.getAttribute('data-pick-id');
        if (pickedId === 'org') {
          if (scopeSelect) scopeSelect.value = 'org';
          if (projectFilterSelect) projectFilterSelect.value = 'org';
        } else if (pickedId === 'multi') {
          if (scopeSelect) scopeSelect.value = 'multi';
          if (projectFilterSelect) projectFilterSelect.value = 'all';
          const cbs = Array.from(document.querySelectorAll('.proj-scope-cb'));
          cbs.forEach((cb, i) => { cb.checked = i < 5; });
        } else {
          if (scopeSelect) scopeSelect.value = 'single';
          if (projectFilterSelect) projectFilterSelect.value = pickedId;
          document.querySelectorAll('.proj-scope-cb').forEach(cb => {
            cb.checked = (cb.value === pickedId);
          });
        }
        if (projectPickerDropdown) projectPickerDropdown.style.display = 'none';
        if (projectSelectorBtn) projectSelectorBtn.setAttribute('aria-expanded', 'false');
        handleFilterChange();
      });
    });
  }

  if (projectSelectorBtn && projectPickerDropdown) {
    projectSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = projectPickerDropdown.style.display === 'flex';
      if (isOpen) {
        projectPickerDropdown.style.display = 'none';
        projectSelectorBtn.setAttribute('aria-expanded', 'false');
      } else {
        renderProjectPickerList(projectPickerSearchInput ? projectPickerSearchInput.value : '');
        projectPickerDropdown.style.display = 'flex';
        projectSelectorBtn.setAttribute('aria-expanded', 'true');
        if (projectPickerSearchInput) {
          setTimeout(() => projectPickerSearchInput.focus(), 30);
        }
      }
    });

    if (projectPickerSearchInput) {
      projectPickerSearchInput.addEventListener('click', (e) => e.stopPropagation());
      projectPickerSearchInput.addEventListener('input', () => {
        renderProjectPickerList(projectPickerSearchInput.value);
      });
    }

    document.addEventListener('click', (e) => {
      if (projectPickerDropdown.style.display === 'flex' &&
          !projectPickerDropdown.contains(e.target) &&
          !projectSelectorBtn.contains(e.target)) {
        projectPickerDropdown.style.display = 'none';
        projectSelectorBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (globalSearchInput) {
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = globalSearchInput.value.trim();
        if (tableFilterInput) tableFilterInput.value = q;
        switchTab('breakdown');
        renderServiceTable();
        showSnackbar(`Filtered Cost Breakdown by search query: "${q || 'All'}"`);
      }
    });
  }

  const notificationsBtn = document.getElementById('notificationsBtn');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', () => {
      showSnackbar('Active Alerts: (1) Production Budget at 83% ($12,450/$15,000) • (2) 5 Idle PD Disks in htr-dev-service.');
    });
  }

  const helpDocsBtn = document.getElementById('helpDocsBtn');
  if (helpDocsBtn) {
    helpDocsBtn.addEventListener('click', () => {
      switchTab('copilot');
      showSnackbar('Opened Gemini Cloud FinOps Copilot & Architecture Documentation Assistant.');
    });
  }

  const userProfileBtn = document.getElementById('userProfileBtn');
  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', () => {
      showSnackbar('Authenticated Principal: admin@imedtra.altostrat.com | Project: argolis-finops-hub-14419');
    });
  }

  const btnCreateBudget = document.getElementById('btnCreateBudget');
  if (btnCreateBudget) {
    btnCreateBudget.addEventListener('click', () => {
      const container = btnCreateBudget.closest('.card-gcp')?.querySelector('.card-gcp-body');
      if (container) {
        const newCard = document.createElement('div');
        newCard.style.cssText = 'border: 1px solid var(--google-blue); border-radius: var(--radius-md); padding: 16px;';
        newCard.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 15px; font-weight: 600;">Argolis FinOps Hub Budget (argolis-finops-hub-14419)</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Scope: Project (argolis-finops-hub-14419) • Pub/Sub Alert Enabled</div>
            </div>
            <span class="status-pill success">Active (36.8%)</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
            <span>Current Spend: <strong>$1,840.00</strong></span>
            <span>Target Budget: <strong>$5,000.00</strong></span>
          </div>
          <div class="kpi-progress" style="height: 10px;">
            <div class="kpi-progress-fill" style="width: 36.8%; background-color: var(--google-green);"></div>
          </div>
        `;
        container.prepend(newCard);
      }
      showSnackbar('Created new budget alert for argolis-finops-hub-14419 ($5,000/mo threshold).');
    });
  }

  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', () => {
      const form = document.getElementById('settingsForm');
      if (form) form.reset();
      showSnackbar('FinOps Hub settings reset to argolis-finops-hub-14419 defaults.');
    });
  }

  // -------------------------------------------------------------
  // CSV / Report Exporter
  // -------------------------------------------------------------
  function exportCsvFile(filename, rows) {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportReportBtn = document.getElementById('exportReportBtn');
  const tableDownloadCsvBtn = document.getElementById('tableDownloadCsvBtn');

  function exportFullBillingReport() {
    const header = ['Google Cloud Service', 'SKU Description', 'Project ID', 'Region', 'Monthly Usage', 'Cost (USD)', 'Trend (30d)'];
    const rows = serviceCostData.map(s => [s.service, s.sku, s.project, s.region, s.usage, s.cost.toFixed(2), s.trend]);
    exportCsvFile(`GCP_FinOps_Report_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    showSnackbar('Generated and downloaded comprehensive FinOps billing report.');
  }

  if (exportReportBtn) exportReportBtn.addEventListener('click', exportFullBillingReport);
  if (tableDownloadCsvBtn) tableDownloadCsvBtn.addEventListener('click', exportFullBillingReport);

  // Settings Save
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      showSnackbar('FinOps configuration successfully saved to argolis-finops-hub-14419.');
    });
  }

  // -------------------------------------------------------------
  // Google Snackbar / Toast Feedback Helper
  // -------------------------------------------------------------
  const snackbar = document.getElementById('appSnackbar');
  const snackbarMessage = document.getElementById('snackbarMessage');
  const snackbarActionBtn = document.getElementById('snackbarActionBtn');
  let snackbarTimeout = null;

  function showSnackbar(msg, actionText = null, onAction = null) {
    if (!snackbar || !snackbarMessage) return;
    clearTimeout(snackbarTimeout);

    snackbarMessage.textContent = msg;

    if (actionText && onAction && snackbarActionBtn) {
      snackbarActionBtn.style.display = 'inline-block';
      snackbarActionBtn.textContent = actionText;
      snackbarActionBtn.onclick = () => {
        onAction();
        hideSnackbar();
      };
    } else if (snackbarActionBtn) {
      snackbarActionBtn.style.display = 'none';
    }

    snackbar.classList.add('visible');
    snackbarTimeout = setTimeout(() => {
      hideSnackbar();
    }, 4500);
  }

  function hideSnackbar() {
    if (snackbar) snackbar.classList.remove('visible');
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  initOverviewCharts();
  renderRecommendations();
  renderQuickRecList();
  handleBqTableChange();
  loadSqlPreset('topServices');
  renderQueryResults('topServices');
  updateSavingsMetrics();

  console.log('Google Cloud FinOps Hub (argolis-finops-hub-14419) initialized successfully.');
});
