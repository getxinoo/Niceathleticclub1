import https from 'https';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups', 'cms-before-migration');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

function fetchAndSave(slug) {
  const url = `https://nicefitness.de/api/pages.php?slug=${slug}`;
  console.log(`Fetching ${url}...`);
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const filename = path.join(BACKUP_DIR, `${slug}_${TIMESTAMP}.json`);
        fs.writeFileSync(filename, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`Saved ${slug} snapshot to ${filename}`);
      } catch (err) {
        console.error(`Failed to parse JSON for ${slug}:`, err.message);
      }
    });
  }).on('error', (err) => {
    console.error(`Request error for ${slug}:`, err.message);
  });
}

fetchAndSave('preise');
fetchAndSave('studio');
