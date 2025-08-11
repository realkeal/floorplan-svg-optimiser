# Floorplan SVG Optimiser

A CLI tool to optimize SVG floorplan files for web use.

## Features

- **SVGO Integration**: Optimizes SVGs using SVGO with custom configuration
- **Furniture/Label Class Conversion**: Converts IDs containing "furniture" or "label" to classes
- **Interactive Option Renaming**: Allows renaming of floorplan options
- **Automatic Hiding**: Sets all options to `visibility:hidden` by default
- **Size Reduction Reporting**: Shows file size reduction statistics

## Installation

```bash
npm install
npm link
```

## Usage

```bash
floorplan-optim input.svg
```

The optimized file will be saved as `input-web.svg` in the same directory.

### What it does:

1. Runs the SVG through SVGO with `cleanupIds` and `removeUselessDefs` disabled
2. Converts all `<g id="*furniture*">` to `<g class="furniture">`
3. Converts all `<g id="*label*">` to `<g class="labels">`
4. Finds direct children of `<g id="options">` and allows you to rename them
5. Adds `style="visibility:hidden"` to all option groups
6. Removes title, desc, and data-* attributes (except data-name)

## Example

```bash
$ floorplan-optim floorplan.svg

Running SVGO optimization...
Applying custom floorplan optimizations...
Converting furniture IDs to classes...
Converting label IDs to classes...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 5 option(s) to rename
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/5] Current ID: "Guest_Suite"
Enter new name (or press Enter to keep): guest-suite
✓ Will rename to: "guest-suite"

[2/5] Current ID: "Mk2"
Enter new name (or press Enter to keep): 
✓ Keeping: "Mk2"

Applying changes to options...

Optimized SVG written to: floorplan-web.svg
Original size: 125432 bytes
Optimized size: 98765 bytes
Size reduction: 21.25%
```

## License

MIT