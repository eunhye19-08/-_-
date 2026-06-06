import fs from 'fs';
import path from 'path';

const now = Date.now();
const threshold = 15 * 60 * 1000;
const results = [];

function scan(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'proc' || file === 'sys' || file === 'dev' || file === 'node_modules' || file === '.git' || file === '.cache' || file === 'lib' || file === 'lib64' || file === 'usr' || file === 'bin' || file === 'sbin') {
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
      } else {
        if (now - stat.mtimeMs < threshold) {
          results.push({ path: fp, mtime: stat.mtimeMs, size: stat.size });
        }
      }
    }
  } catch (e) {}
}

scan('/');
console.log("Newly created files in system in the last 15 mins:");
console.log(JSON.stringify(results, null, 2));
