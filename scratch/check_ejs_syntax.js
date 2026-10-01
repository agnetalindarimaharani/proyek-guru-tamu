const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const viewsDir = path.join(__dirname, '../views');

function getAllEjsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllEjsFiles(fullPath, fileList);
    } else if (file.endsWith('.ejs')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const ejsFiles = getAllEjsFiles(viewsDir);
console.log(`Checking ${ejsFiles.length} EJS templates for syntax errors...`);

let errors = 0;
for (const file of ejsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  try {
    ejs.compile(content, { filename: file });
    console.log(`✅ [OK] ${path.relative(viewsDir, file)}`);
  } catch (err) {
    console.error(`❌ [ERROR] ${path.relative(viewsDir, file)}:`, err.message);
    errors++;
  }
}

if (errors === 0) {
  console.log('\n🎉 ALL EJS TEMPLATES COMPILED SUCCESSFULLY WITH ZERO SYNTAX ERRORS!');
} else {
  console.error(`\n❌ FOUND ${errors} TEMPLATE COMPILATION ERRORS!`);
  process.exit(1);
}
