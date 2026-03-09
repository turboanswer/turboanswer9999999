#!/bin/bash
echo "Clearing any git locks..."
rm -f .git/index.lock .git/MERGE_HEAD .git/MERGE_MSG 2>/dev/null

echo "Force pushing to GitHub..."
git push origin main --force

echo ""
if [ $? -eq 0 ]; then
  echo "Done! All code has been pushed to GitHub."
else
  echo "Push failed. Make sure your GitHub integration is connected in Replit."
fi
