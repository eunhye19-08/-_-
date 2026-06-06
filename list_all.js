import fs from 'fs';
import path from 'path';

function scanDir(dir, depth=0) {
  if (depth > 3) return;
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fp = path.join(dir, file);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
         if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.cache') {
           console.log("  ".repeat(depth) + "[D] " + fp);
           scanDir(fp, depth + 1);
         }
      } else {
        console.log("  ".repeat(depth) + "[F] " + fp + " (" + stat.size + " bytes)");
      }
    });
  } catch (e){}
}

console.log("Scanning /app:");
scanDir('/app');
