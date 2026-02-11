#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Cloudflare Preview Deploy — deploy any branch for testing
// Usage: node scripts/preview-deploy.cjs [branch-name]
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const branch = process.argv[2] || execSync('git branch --show-current').toString().trim();

console.log(`\n🚀 Deploying preview for branch: ${branch}\n`);

try {
  // Build first
  console.log('Building...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Deploy to Cloudflare Pages with branch name
  // This creates a preview URL like: https://<hash>.<project>.pages.dev
  console.log(`\nDeploying to Cloudflare Pages (branch: ${branch})...`);
  const result = execSync(
    `npx wrangler pages deploy dist --project-name=numbahwan --branch="${branch}" --commit-dirty=true`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  
  // Extract the preview URL
  const urlMatch = result.match(/https:\/\/[^\s]+\.pages\.dev/);
  if (urlMatch) {
    console.log(`\n✅ Preview deployed!`);
    console.log(`   URL: ${urlMatch[0]}`);
    console.log(`   Branch: ${branch}`);
    console.log(`\n   Share this URL to test before merging.\n`);
  } else {
    console.log(result);
  }
} catch (err) {
  // Still try to extract URL from stderr
  const output = (err.stdout || '') + (err.stderr || '');
  const urlMatch = output.match(/https:\/\/[^\s]+\.pages\.dev/);
  if (urlMatch) {
    console.log(`\n✅ Preview deployed: ${urlMatch[0]}\n`);
  } else {
    console.error('Deploy failed:', err.message);
    process.exit(1);
  }
}
