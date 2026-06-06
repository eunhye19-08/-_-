import fs from 'fs';
import path from 'path';

const now = Date.now();
const tenMinutes = 10 * 60 * 1000;
const results = [];

function scan(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'proc' || file === 'sys' || file === 'dev' || file === 'node_modules' || file === '.git' || file === '.cache') {
        continue;
      }
      const fp = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fp);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        scan(fp);
      } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        results.push({ path: fp, mtime: stat.mtimeMs, size: stat.size });
      }
    }
  } catch (e) {}
}

scan('/');
console.log("Found all images in system:");
console.log(JSON.stringify(results, null, 2));
