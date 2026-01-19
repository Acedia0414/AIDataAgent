#!/usr/bin/env node
/**
 * Bulk metadata upload script
 * Usage: node scripts/upload-metadata.mjs [server-url]
 *
 * Uploads all XML files from Ax/AxTable/a-* folders to the server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration
const SERVER_URL = process.argv[2] || 'http://139.180.128.172:3000';
const BATCH_SIZE = 50; // Files per API call
const AX_TABLE_DIR = path.join(ROOT_DIR, 'Ax/AxTable');

// Get all a-* folders
const folders = fs.readdirSync(AX_TABLE_DIR)
    .filter(f => f.startsWith('a-'))
    .map(f => path.join(AX_TABLE_DIR, f));

console.log(`📁 Found ${folders.length} folders: ${folders.map(f => path.basename(f)).join(', ')}`);

// Collect all XML files
const xmlFiles = [];
for (const folder of folders) {
    const files = fs.readdirSync(folder)
        .filter(f => f.endsWith('.xml'))
        .map(f => path.join(folder, f));
    xmlFiles.push(...files);
}

console.log(`📄 Found ${xmlFiles.length} XML files total\n`);

// Read file contents
const fileData = xmlFiles.map(filePath => ({
    filename: path.basename(filePath),
    content: fs.readFileSync(filePath, 'utf-8'),
}));

// Split into batches
const batches = [];
for (let i = 0; i < fileData.length; i += BATCH_SIZE) {
    batches.push(fileData.slice(i, i + BATCH_SIZE));
}

console.log(`📦 Split into ${batches.length} batches of ${BATCH_SIZE} files each\n`);

// Upload each batch
let totalProcessed = 0;
let totalErrors = 0;

for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n🚀 Uploading batch ${i + 1}/${batches.length} (${batch.length} files)...`);

    try {
        const response = await fetch(`${SERVER_URL}/api/trpc/metadata.uploadBulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                json: {
                    files: batch,
                    replaceExisting: i === 0, // Only replace on first batch
                }
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ HTTP Error ${response.status}: ${text}`);
            totalErrors += batch.length;
            continue;
        }

        const result = await response.json();

        if (result.result?.data?.json) {
            const data = result.result.data.json;
            console.log(`✅ Batch ${i + 1}: ${data.tablesProcessed} tables processed`);
            if (data.errors?.length > 0) {
                console.log(`   ⚠️  ${data.errors.length} errors:`, data.errors.slice(0, 3).join(', '));
                totalErrors += data.errors.length;
            }
            totalProcessed += data.tablesProcessed;
        } else {
            console.log(`⚠️  Unexpected response format:`, JSON.stringify(result).slice(0, 200));
        }
    } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error.message);
        totalErrors += batch.length;
    }

    // Small delay between batches
    await new Promise(r => setTimeout(r, 500));
}

console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Upload Complete!`);
console.log(`   ✅ Tables processed: ${totalProcessed}`);
console.log(`   ❌ Errors: ${totalErrors}`);
console.log(`${'='.repeat(50)}\n`);
