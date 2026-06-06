import fs from 'fs';
import path from 'path';

const results = [];
function scan(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fp = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fp);
      } catch (e) { continue; }
      if (stat.isDirectory()) {
        scan(fp);
      } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        results.push(fp);
      }
    }
  } catch (e) {}
}

scan('/www-data-home');
scan('/root');
console.log("Images in www-data-home and root:", results);
