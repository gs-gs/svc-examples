# Independent Criteria Solution for SVC

This document describes the solution for GitHub issues [#2](https://github.com/gs-gs/svc-examples/issues/2) and [#3](https://github.com/gs-gs/svc-examples/issues/3), which addresses the need for independently versioned criteria that are resolvable at their own URLs.

## Problem Statement

The original SVC format embedded criteria directly within catalogs, creating several issues:

1. **Criterion versioning tied to catalog versioning**: All criteria get new IDs when a catalog is updated, even if the criteria themselves haven't changed
2. **Non-resolvable criterion URLs**: Criterion IDs were sub-paths of catalogs that didn't resolve to actual content
3. **Monolithic structure**: No way to access, reference, or version individual criteria independently

### Original Structure (Problems)
```
https://responsiblebusiness.org/vocabulary/rba-vap-standard/8.0.2/A1
                                                              ^^^^^ ^^
                                                        catalog version │
                                                                     criterion ID
```

**Issues:**
- When catalog updates to 8.0.3, ALL criteria get new URLs (even unchanged ones)
- URLs don't resolve to actual criterion content
- No independent versioning of criteria

## Solution Overview

The solution transforms monolithic SVC catalogs into a structure with independently versioned criteria:

### New Structure (Solution)
```
Catalog: https://responsiblebusiness.org/vocabulary/rba-vap-standard/8.0.2
Criteria: https://responsiblebusiness.org/criteria/no-forced-labor/1/
          https://responsiblebusiness.org/criteria/safe-workplace/2/
          https://responsiblebusiness.org/criteria/fair-wages/1/
```

**Benefits:**
- Criteria have stable, independent URLs
- Individual criteria can be updated without affecting others
- Each criterion URL resolves to actual content (HTML + JSON)
- Catalogs reference criteria by their independent IDs

## Architecture

### 1. Independent Criterion Structure

Each criterion is stored in its own directory with both HTML and JSON representations:

```
dist/
├── index.html                # Main discovery page with catalog links
├── criteria/
│   ├── no-forced-labor/
│   │   └── 1/
│   │       ├── index.html    # Human-readable version
│   │       └── index.json    # Machine-readable version
│   ├── safe-workplace/
│   │   ├── 1/
│   │   │   ├── index.html
│   │   │   └── index.json
│   │   └── 2/               # New version of same criterion
│   │       ├── index.html
│   │       └── index.json
└── vocabulary/
    └── rba-vap-standard/
        └── 8.0.2/
            ├── index.html    # Catalog HTML
            └── index.json    # Catalog JSON (with references)
```

### 2. Updated Catalog Format

Catalogs now contain **references** to independent criteria instead of embedding them:

```json
{
  "conformityCriterion": [
    {
      "type": ["CriterionReference"],
      "id": "https://responsiblebusiness.org/criteria/no-forced-labor/1/",
      "name": "Prohibition of Forced Labor",
      "version": "1"
    }
  ]
}
```

### 3. Content Negotiation

The development server supports content negotiation:

- **Browsers** (Accept: text/html) → HTML version
- **API clients** (Accept: application/json) → JSON version
- **Direct file access** → `.html` or `.json` extensions work

## Tools and Usage

### 1. SVC Generator

Transforms monolithic catalogs to independent criteria structure.

**Command:**
```bash
npm run generate <catalog-file> -- [options]
```

**Options:**
- `--output-dir <dir>` - Output directory (default: dist)
- `--base-url <url>` - Base URL for generated IDs (default: https://responsiblebusiness.org)
- `--criteria-path <path>` - Path for criteria (default: criteria)
- `--catalog-path <path>` - Path for catalog (default: vocabulary)
- `--verbose` - Enable verbose logging

**Example:**
```bash
npm run generate \
  catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json -- \
  --verbose
```

### 2. Development Server

Serves the generated structure with content negotiation support.

**Command:**
```bash
npm run serve -- [options]
```

**Options:**
- `--port <number>` - Port to listen on (default: 3000)
- `--host <string>` - Host to bind to (default: localhost)
- `--root-dir <path>` - Root directory to serve (default: ./dist)
- `--verbose` - Enable verbose logging

**Example:**
```bash
npm run serve -- --root-dir dist --port 8080 --verbose
# Navigate to http://localhost:8080/ to see the discovery index
```

### 3. Enhanced SVC Viewer (v2)

The new viewer (`svc-viewer-v2.html`) supports both embedded and independent criteria:

**Features:**
- Auto-loads `catalog.json` if present
- Supports file upload and URL loading
- Fetches independent criteria dynamically
- Visual distinction between embedded and referenced criteria
- Works with both old and new SVC formats

## Complete Workflow

### Step 1: Rebase URLs in Source Catalog
```bash
# Rebase URLs to point to localhost in the source catalog BEFORE transformation
npm run rebase-urls \
  catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json -- \
  -f "https://responsiblebusiness.org" \
  -t "http://localhost:3000" \
  -o catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json
```

### Step 2: Generate Independent Structure
```bash
# Transform the localhost-rebased catalog so criteria have localhost URLs from the start
npm run generate \
  catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json -- \
  --base-url "http://localhost:3000" \
  --verbose
```

### Step 3: Serve with Content Negotiation
```bash
# Start development server
npm run serve -- --root-dir dist --verbose
```

### Step 4: Test Content Negotiation
```bash
# Get JSON version (for APIs)
curl -H "Accept: application/json" \
  http://localhost:3000/criteria/prohibition-of-forced-labor/1/

# Get HTML version (for browsers)
curl -H "Accept: text/html" \
  http://localhost:3000/criteria/prohibition-of-forced-labor/1/
```

### Step 5: Explore Generated Content
**Option A: Use the Discovery Index**
1. Navigate to `http://localhost:3000/` in your browser
2. Browse available catalogs and criteria from the main index page
3. Click through to view individual catalogs and criteria

**Option B: Use the Enhanced Viewer**
1. Copy the generated catalog: `cp dist/vocabulary/*/index.json catalog.json`
2. Open `svc-viewer-v2.html` in your browser
3. The viewer auto-loads and displays criteria with dynamic fetching

## Demo

Run the complete demonstration:

```bash
./demo.sh
```

This script:
1. Shows the original monolithic structure
2. **Rebases URLs to localhost BEFORE transformation**
3. Transforms the rebased catalog to independent criteria
4. Starts a development server
5. Tests content negotiation
6. Demonstrates the benefits (with working criterion links)
7. Creates a discovery index for easy catalog navigation

## Benefits

### For Issue #2 (Independent Versioning)
- ✅ Criteria can be versioned independently of catalogs
- ✅ Stable URLs that don't change with catalog updates
- ✅ Each criterion can evolve at its own pace
- ✅ Catalog updates only affect changed criteria

### For Issue #3 (Resolvable URLs)
- ✅ Every criterion ID resolves to actual content
- ✅ Content negotiation (HTML for humans, JSON for APIs)
- ✅ Both static generation and dynamic serving supported
- ✅ Standard web technologies (no special infrastructure needed)

### Additional Benefits
- 🔄 **Better caching**: Unchanged criteria can be cached longer
- 📈 **Easier tracking**: Individual criterion evolution is visible
- 🔧 **API-friendly**: Direct JSON access for integrations
- 🌐 **Web-native**: Works with standard web infrastructure
- 📱 **Multi-format**: Same data in multiple representations

## Migration Path

### Existing Monolithic Catalogs
1. Use `svc-generator.js` to transform existing catalogs
2. Host the generated structure
3. Update any tooling to use the new format
4. The old URLs can redirect to new independent URLs

### New Catalogs
1. Create criteria as independent resources first
2. Build catalogs that reference these criteria
3. Use version numbers to track criterion evolution

## Future Enhancements

### Planned Improvements
- **Automatic version detection**: Hash-based version assignment
- **Dependency tracking**: Show which catalogs use each criterion
- **Criterion relationships**: Model dependencies between criteria
- **Change tracking**: Show diffs between criterion versions
- **Batch operations**: Update multiple catalogs at once

### Integration Opportunities
- **CI/CD integration**: Automated generation and deployment
- **Content management**: Web interface for criterion editing
- **Analytics**: Track criterion usage across catalogs
- **Validation**: Ensure criterion references are valid

## Technical Details

### File Structure
```
dist/
├── index.html            # Main discovery page with catalog links
├── criteria/              # Independent criteria
│   └── {criterion-slug}/
│       └── {version}/
│           ├── index.html # Content negotiation
│           └── index.json
└── vocabulary/           # Updated catalogs
    └── {scheme-path}/
        └── {version}/
            ├── index.html
            └── index.json
```

### URL Patterns
- Criteria: `/{criteria-path}/{criterion-slug}/{version}/`
- Catalogs: `/{catalog-path}/{scheme-path}/{version}/`

### Content Types
- HTML: `text/html` - Human-readable pages
- JSON: `application/json` - Machine-readable data
- Directory listings: Available when no index files exist

## Support

### Package Scripts
```bash
npm run generate      # Run SVC generator
npm run rebase-urls   # Rebase URLs in SVC files
npm run serve        # Start development server
```

### Global CLI Tools
```bash
npm install -g .
svc-generate <catalog-file> [options]
svc-rebase-urls <catalog-file> [options]
svc-serve [options]
```

### Direct Node.js Usage
If you prefer to run the scripts directly:
```bash
node src/svc-generator.js <catalog-file> [options]
node src/rebase-urls.js <catalog-file> [options]
node src/dev-server.js [options]
```

This solution provides a complete transformation from monolithic SVC catalogs to independently versioned, resolvable criteria while maintaining backward compatibility and supporting modern web standards.