#!/usr/bin/env node
/**
 * =============================================================================
 * NumbahWan Media Downloader
 * Smooth batch download from GenSpark file wrapper URLs
 * =============================================================================
 * 
 * USAGE:
 *   node download-media.js <manifest.json> <output_dir>
 * 
 * MANIFEST FORMAT:
 *   {
 *     "files": [
 *       { "url": "https://www.genspark.ai/api/files/s/XXX", "name": "01-image" },
 *       { "url": "https://www.genspark.ai/api/files/s/YYY", "name": "02-image" }
 *     ]
 *   }
 * 
 * Or simply an array of objects:
 *   [
 *     { "url": "...", "name": "..." },
 *     ...
 *   ]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONCURRENT_DOWNLOADS = 5;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// =============================================================================
// HELPERS
// =============================================================================
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    progress: (current, total, name) => {
        process.stdout.write(`\r${colors.cyan}[${current}/${total}]${colors.reset} Downloading: ${name}...`);
    }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// DOWNLOAD FUNCTION
// =============================================================================
async function downloadFile(url, outputPath, attempt = 1) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, { 
            headers: { 
                'User-Agent': 'NumbahWan-MediaDownloader/1.0'
            }
        }, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFile(response.headers.location, outputPath, attempt)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(outputPath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve(outputPath);
            });

            fileStream.on('error', (err) => {
                fs.unlink(outputPath, () => {}); // Clean up
                reject(err);
            });
        });

        request.on('error', async (err) => {
            if (attempt < RETRY_ATTEMPTS) {
                await sleep(RETRY_DELAY * attempt);
                downloadFile(url, outputPath, attempt + 1)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(err);
            }
        });

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// =============================================================================
// BATCH DOWNLOAD WITH CONCURRENCY
// =============================================================================
async function batchDownload(files, outputDir, concurrency = CONCURRENT_DOWNLOADS) {
    const results = { success: [], failed: [] };
    const total = files.length;
    let completed = 0;

    // Process in chunks
    for (let i = 0; i < files.length; i += concurrency) {
        const chunk = files.slice(i, i + concurrency);
        
        const promises = chunk.map(async (file) => {
            const ext = file.ext || '.png';
            const outputPath = path.join(outputDir, `${file.name}${ext}`);
            
            try {
                await downloadFile(file.url, outputPath);
                completed++;
                log.progress(completed, total, file.name);
                results.success.push({ name: file.name, path: outputPath });
            } catch (err) {
                completed++;
                results.failed.push({ name: file.name, error: err.message });
            }
        });

        await Promise.all(promises);
    }

    console.log(''); // New line after progress
    return results;
}

// =============================================================================
// GENERATE MANIFEST FROM URL LIST
// =============================================================================
function generateManifest(urls, prefix = 'file') {
    return urls.map((url, i) => ({
        url: url.trim(),
        name: `${String(i + 1).padStart(2, '0')}-${prefix}`
    }));
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      NumbahWan Media Downloader                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  node download-media.js <manifest.json> <output_dir>
  node download-media.js --urls <url1,url2,...> <output_dir> [prefix]

MANIFEST FORMAT (manifest.json):
  {
    "files": [
      { "url": "https://www.genspark.ai/api/files/s/XXX", "name": "01-image" },
      { "url": "https://www.genspark.ai/api/files/s/YYY", "name": "02-image" }
    ]
  }

EXAMPLES:
  # From manifest file
  node download-media.js wyckoff-manifest.json ./public/static/wyckoff

  # From comma-separated URLs
  node download-media.js --urls "url1,url2,url3" ./output prefix
`);
        process.exit(1);
    }

    let files;
    let outputDir;

    if (args[0] === '--urls') {
        // Direct URL mode
        const urls = args[1].split(',').map(u => u.trim());
        outputDir = args[2];
        const prefix = args[3] || 'file';
        files = generateManifest(urls, prefix);
    } else {
        // Manifest file mode
        const manifestPath = args[0];
        outputDir = args[1];

        if (!fs.existsSync(manifestPath)) {
            log.error(`Manifest not found: ${manifestPath}`);
            process.exit(1);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        files = manifest.files || manifest;
    }

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    log.info(`Downloading ${files.length} files to ${outputDir}`);
    log.info(`Concurrency: ${CONCURRENT_DOWNLOADS}`);
    console.log('');

    const startTime = Date.now();
    const results = await batchDownload(files, outputDir);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║         Download Complete             ║');
    console.log('╠═══════════════════════════════════════╣');
    console.log(`║  Success: ${String(results.success.length).padEnd(27)} ║`);
    console.log(`║  Failed:  ${String(results.failed.length).padEnd(27)} ║`);
    console.log(`║  Time:    ${String(elapsed + 's').padEnd(27)} ║`);
    console.log('╚═══════════════════════════════════════╝');

    if (results.failed.length > 0) {
        console.log('\nFailed downloads:');
        results.failed.forEach(f => log.error(`  ${f.name}: ${f.error}`));
    }

    // Output manifest of downloaded files for next step
    const outputManifest = path.join(outputDir, '_downloaded.json');
    fs.writeFileSync(outputManifest, JSON.stringify(results.success, null, 2));
    log.info(`Manifest saved: ${outputManifest}`);
}

main().catch(err => {
    log.error(err.message);
    process.exit(1);
});
