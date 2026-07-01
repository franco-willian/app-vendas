const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace alert( with toast.error( or toast.success(
  if (content.includes('alert(')) {
    content = content.replace(/alert\((.*?)\)/g, (match, p1) => {
      // Determine if it's an error or success based on keywords
      const p1Lower = p1.toLowerCase();
      if (p1Lower.includes('erro') || p1Lower.includes('falha') || p1Lower.includes('obrigatório') || p1Lower.includes('atingida') || p1Lower.includes('esgotado') || p1Lower.includes('não foi') || p1Lower.includes('já está')) {
        return `toast.error(${p1})`;
      } else {
        return `toast.success(${p1})`;
      }
    });
    
    // Add import { toast } from 'react-hot-toast'; if not exists
    if (!content.includes("import { toast }")) {
      const importStatement = "import { toast } from 'react-hot-toast';\n";
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + importStatement + content.slice(nextLineIndex + 1);
      } else {
        content = importStatement + content;
      }
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refactored alerts in ${path.basename(file)}`);
  }
});
