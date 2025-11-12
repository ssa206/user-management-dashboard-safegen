This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Deploy to Azure

This application is configured to deploy to Azure Static Web Apps. Follow these steps:

### Prerequisites

1. An Azure account ([create one free](https://azure.microsoft.com/free/))
2. Azure CLI installed ([install guide](https://docs.microsoft.com/cli/azure/install-azure-cli))
3. Your code pushed to a GitHub repository

### Deployment Steps

#### Option 1: Using Azure Portal (Recommended for first-time setup)

1. **Create Azure Static Web App**
   - Go to [Azure Portal](https://portal.azure.com)
   - Click "Create a resource" → Search for "Static Web App"
   - Click "Create"

2. **Configure the Static Web App**
   - **Subscription**: Select your Azure subscription
   - **Resource Group**: Create new or select existing
   - **Name**: Choose a unique name (e.g., `user-management-dashboard`)
   - **Plan type**: Select Free or Standard
   - **Region**: Choose closest to your users
   - **Deployment source**: Select "GitHub"

3. **Connect to GitHub**
   - Sign in to GitHub when prompted
   - **Organization**: Select your GitHub organization
   - **Repository**: Select `user-management-dashboard`
   - **Branch**: Select `main`

4. **Build Configuration**
   - **Build Presets**: Select "Next.js"
   - **App location**: `/`
   - **API location**: `` (leave empty)
   - **Output location**: `.next`

5. **Environment Variables**
   - After creation, go to your Static Web App → "Configuration"
   - Add your environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - Any other required variables

6. **Deploy**
   - Click "Review + Create" → "Create"
   - Azure will automatically configure GitHub Actions
   - Your app will deploy automatically on every push to main

#### Option 2: Using Azure CLI

```bash
# Login to Azure
az login

# Create a resource group
az group create --name user-management-rg --location eastus

# Create the static web app
az staticwebapp create \
  --name user-management-dashboard \
  --resource-group user-management-rg \
  --source https://github.com/YOUR_USERNAME/user-management-dashboard \
  --location eastus \
  --branch main \
  --app-location "/" \
  --output-location ".next" \
  --login-with-github
```

#### Option 3: Using Azure Developer CLI

```bash
# Install Azure Developer CLI
# https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd

# Login
azd auth login

# Initialize and provision
azd up
```

### GitHub Secrets Configuration

The GitHub Actions workflow requires a secret token. This is automatically configured when you create the Static Web App through Azure Portal.

If configuring manually:
1. Go to your Azure Static Web App → "Manage deployment token"
2. Copy the token
3. In GitHub: Repository → Settings → Secrets and variables → Actions
4. Add new secret: `AZURE_STATIC_WEB_APPS_API_TOKEN` with the token value
5. Add `DATABASE_URL` and any other environment variables as secrets

### Post-Deployment

After deployment:
1. Your app URL will be: `https://<app-name>.azurestaticapps.net`
2. Configure custom domains in Azure Portal → Static Web App → Custom domains
3. Set up authentication if needed in Azure Portal → Static Web App → Authentication

### Monitoring and Logs

- View deployment logs in GitHub Actions tab
- Monitor application in Azure Portal → Static Web App → Monitoring
- View function logs in Azure Portal → Static Web App → Functions

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- Add others as needed by your application

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/azure/static-web-apps/)
- [Next.js on Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/deploy-nextjs-hybrid)

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
