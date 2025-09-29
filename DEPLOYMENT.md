# Deployment Guide

## Overview

This repository includes automated deployment for both frontend and backend components:

- **Frontend**: React Native Web app deployed to Cloudflare Pages
- **Backend**: Nakama game server deployed to GCP VM via Docker

## Quick Links

- 🌐 **[Frontend Deployment Guide](#frontend-deployment)** - React Native Web to Cloudflare Pages
- 🚀 **[Backend Deployment Guide](./BACKEND_DEPLOYMENT.md)** - Nakama server to GCP VM
- 🔧 **[Server Setup Script](./scripts/server-deploy-setup.sh)** - Automated server provisioning

---

## Frontend Deployment

## Deployment Workflow

The deployment is triggered manually through GitHub Actions and supports:

- **Manual trigger**: Deploy any branch on demand
- **Branch selection**: Choose which branch to deploy
- **Environment selection**: Production or preview deployment

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings (`Settings` > `Secrets and variables` > `Actions`):

### Cloudflare Configuration

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Nakama Server Configuration (Optional)

If not provided, the deployment will use default localhost values:

- `NAKAMA_SERVER_HOST`: Nakama server hostname (default: `127.0.0.1`)
- `NAKAMA_SERVER_PORT`: Nakama server port (default: `7350`)
- `NAKAMA_SERVER_KEY`: Nakama server key (default: `defaultkey`)
- `NAKAMA_USE_SSL`: Whether to use SSL for Nakama connection (default: `false`)

## How to Deploy

1. **Manual Deployment**:
   - Go to the `Actions` tab in your GitHub repository
   - Select `Frontend Production Deployment`
   - Click `Run workflow`
   - Choose:
     - **Branch**: The branch you want to deploy
     - **Environment**: `production` or `preview`
   - Click `Run workflow`

2. **Deployment Process**:
   The workflow will:
   - Checkout the specified branch
   - Setup Node.js and pnpm
   - Install dependencies
   - Run linting and tests
   - Build the React Native Web production bundle
   - Deploy to Cloudflare Pages

## Build Output

- **Build command**: `pnpm run build:web:prod`
- **Build directory**: `frontend/dist`
- **Project name**: `tictactoe-game`

## Cloudflare Pages Setup

1. **Create Cloudflare Pages Project**:
   - Login to Cloudflare Dashboard
   - Go to `Pages` > `Create a project`
   - Connect to Git or use Direct upload
   - Set project name as `tictactoe-game`

2. **Build Settings** (if using Git integration):
   - Build command: `cd frontend && pnpm install && pnpm run build:web:prod`
   - Build output directory: `frontend/dist`
   - Root directory: `/`

## Environment Variables

The build process uses the following environment variables:

```bash
NODE_ENV=production
EXPO_PUBLIC_NAKAMA_SERVER_HOST=${NAKAMA_SERVER_HOST}
EXPO_PUBLIC_NAKAMA_SERVER_PORT=${NAKAMA_SERVER_PORT}
EXPO_PUBLIC_NAKAMA_SERVER_KEY=${NAKAMA_SERVER_KEY}
EXPO_PUBLIC_NAKAMA_USE_SSL=${NAKAMA_USE_SSL}
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Check that all dependencies are properly installed and the build script works locally
2. **Cloudflare Deploy Fails**: Verify API token permissions and account ID
3. **App Doesn't Connect to Backend**: Check Nakama server environment variables

### Local Testing

To test the production build locally:

```bash
cd frontend
pnpm run build:web:prod
npx serve dist
```

The app will be available at `http://localhost:3000`.

## Custom Domain

After deployment, you can:

1. Go to your Cloudflare Pages project
2. Navigate to `Custom domains`
3. Add your custom domain
4. Configure DNS settings as instructed

## Performance

The production build includes:

- **Tree shaking**: Removes unused code
- **Minification**: Reduces bundle size
- **Asset optimization**: Optimizes fonts and images
- **Web platform optimizations**: React Native Web specific optimizations

Current bundle size: ~1.1MB (minified)
