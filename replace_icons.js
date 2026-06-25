const fs = require('fs');
const https = require('https');

const filesToFix = [
  'src/app/admin/departments/page.tsx',
  'src/app/admin/settings/page.tsx',
  'src/app/admin/task-statuses/page.tsx',
  'src/app/admin/users/bulk-upload/page.tsx',
  'src/app/admin/users/page.tsx',
  'src/app/profile/[id]/page.tsx',
  'src/app/superadmin/dashboard/page.tsx',
  'src/app/tasks/[id]/page.tsx',
  'src/app/tasks/page.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/TopNav.tsx'
];

const fetchSvgPath = (iconName) => {
  return new Promise((resolve, reject) => {
    const url = `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/${iconName}/default/24px.svg`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${iconName}: ${res.statusCode}`));
          return;
        }
        const svgContentMatch = data.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
        if (svgContentMatch) {
          resolve(svgContentMatch[1].trim().replace(/\n/g, ' '));
        } else {
          reject(new Error(`No SVG content found for ${iconName}`));
        }
      });
    }).on('error', reject);
  });
};

const run = async () => {
  try {
    const uniqueIcons = new Set();
    const replacementsByFile = {};

    for (const file of filesToFix) {
      if (!fs.existsSync(file)) {
        console.warn(`File not found: ${file}`);
        continue;
      }
      const content = fs.readFileSync(file, 'utf-8');
      replacementsByFile[file] = { content };

      // Normal static icons: <span className="...">icon</span>
      const matches = [...content.matchAll(/<span\s+className="([^"]*material-symbols-outlined[^"]*)"[^>]*>\s*([a-z_]+)\s*<\/span>/g)];
      for (const match of matches) uniqueIcons.add(match[2]);

      // Dynamic icons in Sidebar.tsx: icon: 'dashboard'
      if (file.includes('Sidebar.tsx')) {
        const iconMatches = [...content.matchAll(/icon:\s*'([a-z_]+)'/g)];
        for (const match of iconMatches) uniqueIcons.add(match[1]);
      }
    }

    console.log(`Found unique icons: ${Array.from(uniqueIcons).join(', ')}`);

    const iconSvgContent = {};
    for (const icon of uniqueIcons) {
      console.log(`Fetching SVG for ${icon}...`);
      try {
        iconSvgContent[icon] = await fetchSvgPath(icon);
      } catch (err) {
        console.error(`Error for ${icon}: ${err.message}`);
        iconSvgContent[icon] = `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>`; 
      }
    }

    for (const file of filesToFix) {
      if (!fs.existsSync(file)) continue;
      
      let content = replacementsByFile[file].content;
      let count = 0;

      // Replace static icons
      content = content.replace(/<span\s+className="([^"]*material-symbols-outlined[^"]*)"[^>]*>\s*([a-z_]+)\s*<\/span>/g, (match, className, iconName) => {
        count++;
        const newClassName = className.replace(/\bmaterial-symbols-outlined\b/g, '').replace(/\s+/g, ' ').trim();
        const finalClassAttr = newClassName ? ` className="${newClassName}"` : '';
        const innerSvg = iconSvgContent[iconName] || iconSvgContent['error'];
        return `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"${finalClassAttr}>${innerSvg}</svg>`;
      });

      // Sidebar dynamic replacements
      if (file.includes('Sidebar.tsx')) {
        content = content.replace(/icon:\s*'([a-z_]+)'/g, (match, iconName) => {
          count++;
          const innerSvg = iconSvgContent[iconName] || iconSvgContent['error'];
          // Provide default classes if they had them
          return `icon: <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">${innerSvg}</svg>`;
        });
        // Remove the wrapping span around {link.icon}
        content = content.replace(/<span\s+className="([^"]*material-symbols-outlined[^"]*)"[^>]*>\s*\{link\.icon\}\s*<\/span>/g, (match, className) => {
          count++;
          const newClassName = className.replace(/\bmaterial-symbols-outlined\b/g, '').replace(/\s+/g, ' ').trim();
          if (newClassName) {
            return `<span className="${newClassName}">{link.icon}</span>`;
          }
          return `{link.icon}`;
        });
      }

      if (count > 0) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file} (${count} replacements)`);
      }
    }
    
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
};

run();
