#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const distDir = path.join(repoRoot, 'dist');
const sourceHtmlPath = path.join(distDir, 'index.html');

const fail = (message) => {
    console.error(`[copy-versioned-build] ${message}`);
    process.exit(1);
};

if (!fs.existsSync(packageJsonPath)) {
    fail(`package.json not found: ${packageJsonPath}`);
}

if (!fs.existsSync(sourceHtmlPath)) {
    fail(`build artifact not found: ${sourceHtmlPath}`);
}

let pkg;
try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
    fail(`failed to parse package.json: ${error.message || error}`);
}

const version = String(pkg.version || '').trim();
if (!version) {
    fail('package.json version is empty');
}

const versionedFilename = `Tapnow Studio-V${version}.html`;
const distTargetPath = path.join(distDir, versionedFilename);
const rootTargetPath = path.join(repoRoot, versionedFilename);

try {
    fs.copyFileSync(sourceHtmlPath, distTargetPath);
    fs.copyFileSync(sourceHtmlPath, rootTargetPath);
} catch (error) {
    fail(`copy failed: ${error.message || error}`);
}

console.log('[copy-versioned-build] build artifacts generated:');
console.log(`- ${path.relative(repoRoot, distTargetPath)}`);
console.log(`- ${path.relative(repoRoot, rootTargetPath)}`);
