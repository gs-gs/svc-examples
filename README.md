# Sustainable Vocabulary Catalog (SVC) Examples

This directory contains examples of Sustainable Vocabulary Catalog files and a simple viewer to display them, with the ability to drill down through criteria to whatever level is present in the SVC file.

![SVC Viewer Screenshot](doc/image/svc-viewer.png)

*The SVC Viewer displaying the RBA Validated Assessment Program standard with expandable criteria hierarchy*

The purpose of the repository is to generate and collect initial SVC's that are compliant with the current schema and then incrementally improve their display as needed or requested. No attempt has been made to audit the SVC generation from their respective PDFs.

## 🆕 Independent Criteria Solution

This repository now includes a solution for **independently versioned criteria** that addresses key architectural issues with the original SVC format:

- **Issue #2**: Criteria can now be versioned separately from catalogs
- **Issue #3**: Each criterion ID resolves to its own page with content negotiation

### Key Benefits
- 🔄 **Independent versioning**: Criteria don't get new URLs when catalogs update
- 🔗 **Resolvable URLs**: Every criterion ID serves actual content (HTML + JSON)
- 📱 **Content negotiation**: Browsers get HTML, APIs get JSON
- 🌐 **Web-native**: Works with standard web infrastructure

### Quick Start with Independent Criteria
```bash
# First, rebase URLs for local development (BEFORE transformation)
npm run rebase-urls catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json -- -f "https://responsiblebusiness.org" -t "http://localhost:3000" -o catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json

# Transform the localhost-rebased catalog to independent criteria
npm run generate catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json -- --verbose

# Serve with content negotiation
npm run serve -- --root-dir dist --verbose

# Navigate to http://localhost:3000/ to see the discovery index with all catalogs
# Or view with enhanced viewer (criteria links will work with localhost URLs)
open svc-viewer-v2.html
```

**📖 [Read the full documentation](README-INDEPENDENT-CRITERIA.md)** for detailed information about the independent criteria solution.

## Quick Start (Original Viewer)

To view the SVC files as interactive HTML pages, first either clone the git repository or simply [download the ZIP file of the repo](https://github.com/gs-gs/svc-examples/archive/refs/heads/main.zip) and then:

1. Open `svc-viewer.html` in your web browser
2. Click "Select SVC JSON File" and choose any JSON file from the `catalogs/` directory structure
3. View the interactive content with collapsible sections and expandable criteria hierarchies

**No installation required.** This works offline and doesn't need Python or any web server setup.

## SVC Compliance

Each SVC example is linted using `jsonld lint --safe` and the schema checked with `ajv --spec=draft2020 --strict=false -c ajv-formats -s /path/to/untp-svc-schema-0.6.1.json -d example-svc-file`

TODO: Add a GH action to verify all examples are compliant.

## Contents

- `catalogs/` - Collection of SVC files organized by standards organization:
  - `ResponsibleBusinessAlliance/` - RBA standards including:
    - `ValidatedAssessmentProgram-8.0.2.json` - Standard RBA VAP criteria
    - `ValidatedAssessmentProgram-8.0.2-full.json` - Full RBA VAP with detailed nested sub-criteria
  - `ResponsibleMineralsInitiative/` - RMI standards including:
    - `RiskReadynessAssessment.json` - RMI Risk Readiness Assessment
    - `GlobalResponsibleSourcing-AllMinerals.json` - RMI Global Responsible Sourcing (summary)
    - `GlobalResponsibleSourcing-AllMinerals-full.json` - RMI Global Responsible Sourcing with detailed nested sub-criteria
- `svc-viewer.html` - Standalone HTML viewer for SVC JSON files

### Available Standards

- **RBA Validated Assessment Program** - Comprehensive supply chain compliance verification
- **RMI Risk Readiness Assessment** - Responsible minerals sourcing evaluation
- **RMI Global Responsible Sourcing** - Minerals supply chain due diligence standards

### Generation of SVCs

The SVC examples in this repo were initially created with the following prompt using Claude Sonnet 4:

> Using the JSON schema, instance and context at the following URLs respectively: https://raw.githubusercontent.com/uncefact/spec-untp/refs/tags/v0.6.1/data-models/untp-svc/artefacts/untp-svc-schema.json , https://raw.githubusercontent.com/uncefact/spec-untp/refs/tags/v0.6.1/data-models/untp-svc/artefacts/untp-svc-instance.json , https://raw.githubusercontent.com/uncefact/spec-untp/refs/tags/v0.6.1/data-models/untp-svc/artefacts/context.jsonld , can you create an SVC for the attached document

and attaching the first PDF.

## CLI Tools

The repository includes several command-line tools:

### 1. Independent Criteria Generator
Transform monolithic SVC catalogs into independently versioned criteria (addresses issues #2 and #3):

```bash
# Transform a catalog
npm run generate <catalog-file> -- [options]

# Example
npm run generate catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json -- --verbose
```

**Generates:**
- Individual criteria files with HTML and JSON versions
- Updated catalog with criterion references  
- **Main discovery index** at `dist/index.html` with links to all catalogs

### 2. Development Server
Serve generated criteria with content negotiation support:

```bash
# Start server
npm run serve -- [options]

# Example
npm run serve -- --root-dir dist --port 3000 --verbose
```

### 3. URL Rebasing CLI Tool
Transform URLs in SVC catalogs for different hosting environments:
Rebase URLs in SVC catalog files, addressing [issue #4](https://github.com/gs-gs/svc-examples/issues/4) - the need for configurable domain names when hosting catalogs for demonstrations:

### Installation

```bash
# Install dependencies
npm install

# Or use yarn
yarn install
```

### Usage

The CLI tool allows you to replace base URLs in SVC catalog files:

```bash
# Basic usage - replace URLs and output to stdout
npx svc-rebase-urls catalog.json -f "https://responsiblebusiness.org" -t "https://demo.sustainablevocab.org"

# Save to a new file
npx svc-rebase-urls catalog.json -f "https://responsiblebusiness.org" -t "https://demo.sustainablevocab.org" -o demo-catalog.json

# Dry run to see what would change
npx svc-rebase-urls catalog.json -f "https://responsiblebusiness.org" -t "https://demo.sustainablevocab.org" --dry-run

# Overwrite original file (automatic backup created) with verbose output
npx svc-rebase-urls catalog.json -f "https://responsiblebusiness.org" -t "https://demo.sustainablevocab.org" -o catalog.json --verbose
```

### Options

- `-f, --from <url>`: Base URL to replace (required)
- `-t, --to <url>`: New base URL (required)  
- `-o, --output <file>`: Output file path (default: stdout)

- `-d, --dry-run`: Show what would be changed without modifying files
- `-v, --verbose`: Show detailed output
- `-h, --help`: Show help

### Examples

**Demo hosting**: Transform RBA catalog for demo site
```bash
npx svc-rebase-urls catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json \
  -f "https://responsiblebusiness.org" \
  -t "https://demo.sustainablevocab.org/rba" \
  -o demo/rba-catalog.json
```

**Local development**: Use localhost URLs
```bash
npx svc-rebase-urls catalogs/ResponsibleMineralsInitiative/RiskReadynessAssessment.json \
  -f "https://responsiblemineralsinitiative.org" \
  -t "http://localhost:3000/rmi" \
  -o local-rmi-catalog.json
```

**Preview changes**: Use dry-run mode
```bash
npx svc-rebase-urls catalog.json \
  -f "https://example.com" \
  -t "https://new-domain.org" \
  --dry-run --verbose
```

## Publishing a single catalog

For publishing a single catalog at a public location, the SVC viewer can automatically display a specific catalog without requiring file selection. To publish a catalog for direct viewing:

1. **Copy your SVC JSON file** to the same directory as `svc-viewer.html` and rename it to `catalog.json`. You may also want to rename `svc-viewer.html` to `index.html` at your serving location, depending on your setup.

2. **Serve the directory** using your webserver, or test with a simple web server:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js
   npx serve .

   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**: Navigate to `http://localhost:8000/svc-viewer.html` or simply `http://localhost:8000/` if you renamed the html file to `index.html`.

The viewer will automatically detect and display `catalog.json` without showing the file selector. If `catalog.json` is not present, it falls back to the normal file selection interface.

### Customization

You can customize the appearance by modifying the CSS styles in the HTML file.

This approach is fine for:
- **Demonstrations**: Show a specific catalog to stakeholders
- **Documentation**: Embed in websites or documentation
- **Sharing**: Distribute a complete, self-contained viewer

## Publishing multiple catalogs

If you want to publish multiple catalogs then it would be better to:
1. Extract the CSS style to a separate file,
2. Serve the HTML with server-side rendering that sets the catalog file to load and stylesheet to use based on the request location.

This will enable a single html template file to be maintained while the presentation branded for each catalog as required.

## Content negotiation

When publishing, we'll want the same URL to serve either the JSON catalog data or the HTML viewer depending on what the client requests, based on the Accept header.

### Apache with MultiViews

As an example, Apache supports automatic content negotiation with MultiViews. Create files like:
```
catalog.html      # The viewer (copy of svc-viewer.html)
catalog.json      # The catalog data
```

In `.htaccess`:
```apache
Options +MultiViews
AddType application/json .json
```

Then `http://example.com/catalog` serves:
- `catalog.html` for browsers (`Accept: text/html`)
- `catalog.json` for API clients (`Accept: application/json`)

Other production webservers provide similar functionality - the above is just an example with Apache.

## About SVC

Sustainable Vocabulary Catalog (SVC) is a structured format for defining conformity schemes and their criteria. Read more at [UNTP Sustainable Vocabulary Catalog](https://uncefact.github.io/spec-untp/docs/specification/SustainabilityVocabularyCatalog).

### SVC Evolution
This repository demonstrates the evolution of SVC from a monolithic format to independently versioned criteria:

- **Original format**: Criteria embedded in catalogs with version-dependent URLs
- **New format**: Independent criteria with stable URLs and content negotiation
- **Migration path**: Tools to transform existing catalogs to the new structure

The independent criteria approach provides better versioning, resolvability, and integration capabilities while maintaining compatibility with existing workflows.

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)

## Troubleshooting

**Problem**: File selector doesn't work
**Solution**: Make sure you're using a modern browser. Some older browsers may not support the file API.

**Problem**: Large JSON files load slowly
**Solution**: This is normal for very large files. The viewer processes everything client-side for security.

**Problem**: Can't view files
**Solution**: Ensure the JSON files are valid. The viewer will show an error message if the JSON is malformed.

**Problem**: `catalog.json` doesn't auto-load
**Solution**: Make sure you're serving the directory with a web server (not opening the HTML file directly). The auto-loading feature requires HTTP access to work due to browser security restrictions.
