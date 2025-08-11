#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { optimize } = require('svgo');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: floorplan-optim <input.svg> [output.svg]');
  console.error('If output is not specified, it will be saved with -web suffix');
  process.exit(1);
}

const inputFile = args[0];
let outputFile = args[1];

// If no output file specified, create one with -web suffix
if (!outputFile) {
  const parsedPath = path.parse(inputFile);
  outputFile = path.join(parsedPath.dir, `${parsedPath.name}-web${parsedPath.ext}`);
}

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file "${inputFile}" not found`);
  process.exit(1);
}

// Read the SVG file
let svgContent;
try {
  svgContent = fs.readFileSync(inputFile, 'utf8');
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}

// SVGO configuration with customizations
const svgoConfig = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          removeUselessDefs: false,
        },
      },
    },
    // Add custom plugins here if needed
  ],
};

// Process the SVG with SVGO
console.error('Running SVGO optimization...');
const result = optimize(svgContent, svgoConfig);

if (result.error) {
  console.error(`SVGO error: ${result.error}`);
  process.exit(1);
}

let optimizedSvg = result.data;

// Additional custom processing
console.error('Applying custom floorplan optimizations...');

// Function to create readline interface for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stderr
  });
}

// Function to ask user for input
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to perform custom floorplan optimizations
async function customFloorplanOptimizations(svg) {
  // 1. Convert furniture IDs to class
  console.error('Converting furniture IDs to classes...');
  svg = svg.replace(/<g\s+id="[^"]*furniture[^"]*"([^>]*)>/gi, (match, attributes) => {
    // Check if class attribute already exists
    if (attributes.includes('class=')) {
      // Add to existing class
      return match.replace(/class="([^"]*)"/, 'class="$1 furniture"').replace(/id="[^"]*"\s*/, '');
    } else {
      // Add new class attribute
      return `<g class="furniture"${attributes}>`;
    }
  });

  // 2. Convert label IDs to class
  console.error('Converting label IDs to classes...');
  svg = svg.replace(/<g\s+id="[^"]*label[^"]*"([^>]*)>/gi, (match, attributes) => {
    // Check if class attribute already exists
    if (attributes.includes('class=')) {
      // Add to existing class
      return match.replace(/class="([^"]*)"/, 'class="$1 labels"').replace(/id="[^"]*"\s*/, '');
    } else {
      // Add new class attribute
      return `<g class="labels"${attributes}>`;
    }
  });

  // 3. Handle options group children interactively
  // Find the options group more carefully by matching balanced tags
  let optionsContent = null;
  const optionsStartMatch = svg.match(/<g\s+id="options"[^>]*>/i);
  
  if (optionsStartMatch) {
    const startIndex = optionsStartMatch.index + optionsStartMatch[0].length;
    let depth = 1;
    let currentIndex = startIndex;
    
    // Find the matching closing tag by counting depth
    while (depth > 0 && currentIndex < svg.length) {
      const nextOpen = svg.indexOf('<g', currentIndex);
      const nextClose = svg.indexOf('</g>', currentIndex);
      
      if (nextClose === -1) break;
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Check if it's a self-closing tag
        const selfClosingCheck = svg.substring(nextOpen, svg.indexOf('>', nextOpen) + 1);
        if (!selfClosingCheck.endsWith('/>')) {
          depth++;
        }
        currentIndex = nextOpen + 1;
      } else {
        depth--;
        if (depth === 0) {
          optionsContent = svg.substring(startIndex, nextClose);
          break;
        }
        currentIndex = nextClose + 1;
      }
    }
  }
  
  const optionsMatch = optionsContent !== null;
  
  if (optionsMatch) {
    // optionsContent is already extracted above
    
    // Find all direct child g elements with IDs
    const childPattern = /<g\s+id="([^"]+)"([^>]*)>/g;
    const children = [];
    let childMatch;
    
    // We need to track nesting level to only get direct children
    let tempContent = optionsContent;
    let depth = 0;
    let currentPos = 0;
    
    // Simple approach: find all g tags and track depth
    const gTags = [];
    const gTagPattern = /<\/?g[^>]*>/g;
    let tagMatch;
    
    while ((tagMatch = gTagPattern.exec(optionsContent)) !== null) {
      if (tagMatch[0].startsWith('</g')) {
        depth--;
      } else if (tagMatch[0].startsWith('<g')) {
        if (depth === 0) {
          // This is a direct child
          const idMatch = tagMatch[0].match(/id="([^"]+)"/);
          const dataNameMatch = tagMatch[0].match(/data-name="([^"]+)"/);
          if (idMatch) {
            children.push({
              fullTag: tagMatch[0],
              id: idMatch[1],
              dataName: dataNameMatch ? dataNameMatch[1] : null,
              originalTag: tagMatch[0]
            });
          }
        }
        if (!tagMatch[0].endsWith('/>')) {
          depth++;
        }
      }
    }
    
    if (children.length > 0) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Found ${children.length} option(s) to rename`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      const rl = createReadlineInterface();
      const renames = new Map();
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        console.log(`\n[${i + 1}/${children.length}] Current ID: "${child.id}"`);
        const newName = await askQuestion(rl, 'Enter new name (or press Enter to keep): ');
        
        if (newName.trim()) {
          renames.set(child.id, newName.trim());
          console.log(`✓ Will rename to: "${newName.trim()}"`);
        } else {
          console.log(`✓ Keeping: "${child.id}"`);
        }
      }
      
      rl.close();
      
      // Apply the renames and add visibility:hidden to all found options
      console.log('\nApplying changes to options...');
      for (const child of children) {
        const oldId = child.id;
        const newName = renames.get(oldId) || oldId;
        
        // Replace id, data-name, and add style="visibility:hidden"
        const idPattern = new RegExp(`<g\\s+id="${oldId}"([^>]*)>`, 'g');
        svg = svg.replace(idPattern, (match, attributes) => {
          // Update or add data-name attribute
          let newAttributes = attributes;
          if (renames.has(oldId)) {
            if (newAttributes.includes('data-name=')) {
              newAttributes = newAttributes.replace(/data-name="[^"]*"/, `data-name="${newName}"`);
            } else {
              newAttributes = ` data-name="${newName}"${newAttributes}`;
            }
          }
          
          // Add or update style attribute to include visibility:hidden
          if (newAttributes.includes('style=')) {
            // Add to existing style
            newAttributes = newAttributes.replace(/style="([^"]*)"/, (styleMatch, styleContent) => {
              if (!styleContent.includes('visibility')) {
                return `style="${styleContent};visibility:hidden"`;
              }
              return styleMatch;
            });
          } else {
            // Add new style attribute
            newAttributes = ` style="visibility:hidden"${newAttributes}`;
          }
          
          const finalId = renames.has(oldId) ? newName.replace(/\s+/g, '_') : oldId;
          return `<g id="${finalId}"${newAttributes}>`;
        });
      }
    } else {
      console.log('\n✓ Options group found but no direct children to rename.');
    }
  } else {
    console.log('\n✓ No options group found in the SVG (skipping option renaming).');
  }
  
  // Remove title and desc elements
  svg = svg.replace(/<title>.*?<\/title>/gi, '');
  svg = svg.replace(/<desc>.*?<\/desc>/gi, '');
  
  // Clean up data attributes that might be in floorplans
  svg = svg.replace(/\s+data-[a-z-]+="[^"]*"/gi, (match) => {
    // Keep data-name attributes as we're using them
    if (match.includes('data-name=')) {
      return match;
    }
    return '';
  });
  
  return svg;
}

// Run the async optimization
(async () => {
  optimizedSvg = await customFloorplanOptimizations(optimizedSvg);

  // Output the result
  try {
    fs.writeFileSync(outputFile, optimizedSvg, 'utf8');
    console.error(`\nOptimized SVG written to: ${outputFile}`);
    
    // Calculate and display size reduction
    const originalSize = Buffer.byteLength(svgContent, 'utf8');
    const optimizedSize = Buffer.byteLength(optimizedSvg, 'utf8');
    const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.error(`Original size: ${originalSize} bytes`);
    console.error(`Optimized size: ${optimizedSize} bytes`);
    console.error(`Size reduction: ${reduction}%`);
  } catch (error) {
    console.error(`Error writing file: ${error.message}`);
    process.exit(1);
  }
})();