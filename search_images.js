import fs from 'fs';
import path from 'path';

function findPngs(dir, results = []) {
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      // Skip node_modules, .git, etc.
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.cache') {
        return;
      }
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        return;
      }
      if (stat && stat.isDirectory()) {
        findPngs(fullPath, results);
      } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        results.push(fullPath);
      }
    });
  } catch (e) {
    // ignore
  }
  return results;
}

// Search root and current workspace
console.log("Searching in current directory (root):");
const filesInCurrent = findPngs('.');
console.log(filesInCurrent);

console.log("Searching in system root (/):");
// Also scan any newly added files in common container upload spaces
const uploadDirs = ['/tmp', '/workspace', '/app', '/home', '/usr/src/app', '/opt'];
uploadDirs.forEach(ud => {
  if (fs.existsSync(ud)) {
    console.log(`Searching in ${ud}:`);
    console.log(findPngs(ud));
  }
});
