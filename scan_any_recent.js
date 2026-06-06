import fs from 'fs';
import path from 'path';

// Scan all files in current folder recursively of any type created or modified in the last 3 minutes
const now = Date.now();
const results = [];

function scan(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.cache') continue;
      const fp = path.join(dir, file);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        scan(fp);
      } else {
        if (now - stat.mtimeMs < 180000) { // 3 mins
          results.push({ path: fp, mtime: stat.mtimeMs, size: stat.size });
        }
      }
    }
  } catch (e) {}
}

scan('.');
console.log("Files changed in last 3 mins:", results);
