#!/bin/bash

# Deploy script for web app to Vercel
# Usage: ./scripts/deploy-web.sh

set -e

echo "🚀 Preparing deployment..."

# Check if we're on develop branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "develop" ]; then
  echo "⚠️  Warning: You're not on develop branch. Current branch: $BRANCH"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run build test
echo "🔨 Testing production build..."
cd apps/web
pnpm build
cd ../..

# Commit and push
echo "📝 Committing changes..."
git add .
git status

read -p "Enter commit message: " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="chore: deploy updates"
fi

git commit -m "$COMMIT_MSG" || echo "No changes to commit"

echo "🔄 Pushing to GitHub..."
git push origin $BRANCH

echo "✅ Done! Vercel will automatically deploy your changes."
echo "📊 Check deployment status at: https://vercel.com"
