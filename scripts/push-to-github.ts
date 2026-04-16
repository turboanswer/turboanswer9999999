import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  '.cache',
  '.config',
  '.local',
  '.upm',
  'android',
  'ios',
  'attached_assets',
  'generated-icon.png',
  '.replit',
  'replit.nix',
  '.breakpoints',
  'scripts',
  'package-lock.json',
  'github-pages-deployment',
  'domain-configuration-files',
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return normalizedPath === pattern || 
           normalizedPath.startsWith(pattern + '/') ||
           normalizedPath.includes('/' + pattern + '/') ||
           normalizedPath.endsWith('/' + pattern);
  });
}

function getAllFiles(dirPath: string, basePath: string = ''): Array<{path: string, content: string, isBinary: boolean}> {
  const files: Array<{path: string, content: string, isBinary: boolean}> = [];
  
  try {
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const relativePath = basePath ? `${basePath}/${entry}` : entry;
      
      if (shouldIgnore(relativePath)) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath, relativePath));
      } else if (stat.isFile()) {
        if (stat.size > 50 * 1024 * 1024) continue;
        
        const binaryExts = ['.aab', '.apk', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz', '.keystore'];
        const ext = path.extname(entry).toLowerCase();
        const isBinary = binaryExts.includes(ext);
        
        try {
          if (isBinary) {
            const buffer = fs.readFileSync(fullPath);
            files.push({ path: relativePath, content: buffer.toString('base64'), isBinary: true });
          } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            files.push({ path: relativePath, content: Buffer.from(content).toString('base64'), isBinary: false });
          }
        } catch (e) {
          console.log(`  Skipping ${relativePath}: ${(e as Error).message}`);
        }
      }
    }
  } catch (e) {
    console.error(`Error reading directory ${dirPath}: ${(e as Error).message}`);
  }
  
  return files;
}

async function main() {
  const REPO_NAME = 'TURBOANSWERADVANCED2.2';
  
  console.log('Connecting to GitHub...');
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);
  
  let repoExists = false;
  try {
    await octokit.repos.get({ owner: user.login, repo: REPO_NAME });
    repoExists = true;
    console.log(`Repository ${REPO_NAME} already exists, will update it.`);
  } catch {
    console.log(`Creating repository: ${REPO_NAME}...`);
    await octokit.repos.createForAuthenticatedUser({
      name: REPO_NAME,
      description: 'TurboAnswer Advanced AI Assistant - Multi-model AI system with voice commands, document analysis, crisis support, and more',
      private: false,
      auto_init: false,
    });
    console.log('Repository created!');
  }
  
  console.log('\nScanning project files...');
  const projectRoot = path.resolve(__dirname, '..');
  const files = getAllFiles(projectRoot);
  console.log(`Found ${files.length} files to upload`);
  
  let parentSha: string | undefined;
  
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: user.login,
      repo: REPO_NAME,
      ref: 'heads/main',
    });
    parentSha = ref.object.sha;
  } catch {
    try {
      const { data: ref } = await octokit.git.getRef({
        owner: user.login,
        repo: REPO_NAME,
        ref: 'heads/master',
      });
      parentSha = ref.object.sha;
    } catch {
      console.log('Empty repo detected, initializing with README...');
      await octokit.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: REPO_NAME,
        path: 'README.md',
        message: 'Initial commit',
        content: Buffer.from('# TURBOANSWERADVANCED2.2\nTurboAnswer Advanced AI Assistant\n').toString('base64'),
      });
      await new Promise(r => setTimeout(r, 2000));
      const { data: ref } = await octokit.git.getRef({
        owner: user.login,
        repo: REPO_NAME,
        ref: 'heads/main',
      });
      parentSha = ref.object.sha;
      console.log('Repo initialized!');
    }
  }
  
  console.log('\nCreating file blobs...');
  const treeItems: Array<{path: string, mode: '100644', type: 'blob', sha: string}> = [];
  
  async function uploadWithRetry(file: {path: string, content: string}, retries = 3): Promise<{path: string, sha: string} | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data: blob } = await octokit.git.createBlob({
          owner: user.login,
          repo: REPO_NAME,
          content: file.content,
          encoding: 'base64',
        });
        return { path: file.path, sha: blob.sha };
      } catch (e: any) {
        if (e.status === 403 || e.message?.includes('rate limit') || e.message?.includes('secondary')) {
          const wait = Math.pow(2, attempt + 1) * 2000;
          console.log(`  Rate limited on ${file.path}, waiting ${wait/1000}s...`);
          await new Promise(r => setTimeout(r, wait));
        } else {
          console.log(`  Failed ${file.path}: ${e.message}`);
          return null;
        }
      }
    }
    console.log(`  Skipped ${file.path} after ${retries} retries`);
    return null;
  }

  for (let i = 0; i < files.length; i++) {
    const result = await uploadWithRetry(files[i]);
    if (result) {
      treeItems.push({
        path: result.path,
        mode: '100644',
        type: 'blob',
        sha: result.sha,
      });
    }
    if ((i + 1) % 20 === 0 || i === files.length - 1) {
      console.log(`  Uploaded ${i + 1}/${files.length} files...`);
    }
    if ((i + 1) % 10 === 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log('\nCreating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner: user.login,
    repo: REPO_NAME,
    tree: treeItems,
  });
  
  console.log('Creating commit...');
  const commitData: any = {
    owner: user.login,
    repo: REPO_NAME,
    message: 'TurboAnswer Advanced v2.2 - Full project upload',
    tree: tree.sha,
  };
  if (parentSha) {
    commitData.parents = [parentSha];
  }
  
  const { data: commit } = await octokit.git.createCommit(commitData);
  
  try {
    await octokit.git.updateRef({
      owner: user.login,
      repo: REPO_NAME,
      ref: 'heads/main',
      sha: commit.sha,
      force: true,
    });
  } catch {
    try {
      await octokit.git.createRef({
        owner: user.login,
        repo: REPO_NAME,
        ref: 'refs/heads/main',
        sha: commit.sha,
      });
    } catch {
      await octokit.git.updateRef({
        owner: user.login,
        repo: REPO_NAME,
        ref: 'heads/master',
        sha: commit.sha,
        force: true,
      });
    }
  }
  
  console.log(`\n✅ SUCCESS! All ${treeItems.length} files pushed to GitHub!`);
  console.log(`🔗 Repository: https://github.com/${user.login}/${REPO_NAME}`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
gitpush
