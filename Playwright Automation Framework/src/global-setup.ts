import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  const archiveBaseDir = path.join(__dirname, '..', 'screenshots-archive');

  if (!fs.existsSync(testResultsDir)) return;

  // Check if there are any files worth archiving (screenshots, videos, traces)
  const hasArtifacts = fs.readdirSync(testResultsDir).some(
    (entry) => !entry.endsWith('.json')
  );
  if (!hasArtifacts) return;

  const timestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace('T', '_')
    .replace(/:/g, '-');

  const archiveDir = path.join(archiveBaseDir, timestamp);
  fs.mkdirSync(archiveDir, { recursive: true });

  // Copy entire test-results into timestamped archive folder
  copyDirSync(testResultsDir, archiveDir);
  console.log(`\n📁 Screenshots archived → screenshots-archive/${timestamp}/`);
}

function copyDirSync(src: string, dest: string) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
