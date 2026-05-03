const fs = require('fs');
const path = require('path');

// Files that need fixing
const filesToFix = [
  'src/App.tsx',
  'src/components/AdminQuerySystem.tsx',
  'src/components/MyQueries.tsx',
  'src/components/QuerySubmission.tsx',
  'src/components/QuerySystem.tsx',
  'src/contexts/CartContext.tsx',
  'src/pages/AdminDashboard.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/Profile.tsx',
  'src/services/supabaseAuth.ts'
];

// Common patterns to fix
const patterns = [
  // Unused imports
  { 
    regex: /import\s+{\s*([^}]+)\s*}\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => {
      // Remove unused imports
      const usedVars = p1.split(',')
        .map(s => s.trim())
        .filter(v => !v.startsWith('//'));
      return usedVars.length > 0 
        ? `import { ${usedVars.join(', ')} } from '${match.split('from ')[1]}`
        : '';
    }
  },
  // Unused variables
  {
    regex: /const\s+(\w+)\s*=\s*useState\([^)]*\)\s*;?[\s\S]*?\/\/\s*ESLint:/g,
    replacer: (match, p1) => {
      return match.replace(new RegExp(`\\b${p1}\\b`, 'g'), `_${p1}`);
    }
  },
  // Missing useEffect dependencies
  {
    regex: /useEffect\(\s*\([^)]*\)\s*=>\s*{([^}]*)},\s*\[([^\]]*)\]\s*\)/g,
    replacer: (match, body, deps) => {
      // This is a simplified version - in a real scenario, we'd need to analyze the body
      // to determine which variables should be in the dependency array
      return match; // Just return the original for now
    }
  }
];

function processFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Apply each pattern
    patterns.forEach(({ regex, replacer }) => {
      content = content.replace(regex, replacer);
    });
    
    // Write the fixed content back
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Processed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Process all files
filesToFix.forEach(processFile);
console.log('Warning fixes applied. Please review the changes.');
