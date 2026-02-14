const fs = require('fs');
const path = require('path');

function getFiles(dir, files_) {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.git')) {
        getFiles(name, files_);
      }
    } else {
      if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.tsx') || name.endsWith('.ts')) {
        files_.push(name);
      }
    }
  }
  return files_;
}

const allFiles = getFiles('.');
const largeFiles = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  if (lines > 300) {
    largeFiles.push({ file, lines });
  }
});

largeFiles.sort((a, b) => b.lines - a.lines);
console.log('Large Files (>300 lines):');
largeFiles.forEach(f => console.log(`${f.lines} lines - ${f.file}`));
