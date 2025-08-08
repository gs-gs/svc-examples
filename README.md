# Sustainable Vocabulary Catalog (SVC) Examples

This directory contains examples of Sustainable Vocabulary Catalog files with tools to transform them into independently versioned criteria that can be served and explored via a development server.

The purpose of the repository is to generate and collect initial SVC's that are compliant with the current schema, transform them to independently versioned criteria, and provide tools for serving and exploring the results. No attempt has been made to audit the SVC generation from their respective PDFs, nor to set a standard format for independantly version criteria within an SVC context.

## SVC Architecture

This repository implements a modern SVC architecture where criteria are independently versioned and resolvable at their own URLs.

### Structure
```
Catalog: https://responsiblebusiness.org/vocabulary/rba-vap-standard/8.0.2
Criteria: https://responsiblebusiness.org/criteria/no-forced-labor/1/
          https://responsiblebusiness.org/criteria/safe-workplace/2/
          https://responsiblebusiness.org/criteria/fair-wages/1/
```

### Key Features
- 🔄 **Independent versioning**: Criteria can be updated without changing catalog versions
- 🔗 **Resolvable URLs**: Every criterion ID serves actual content (HTML + JSON)
- 📱 **Content negotiation**: Browsers get HTML, APIs get JSON
- 🌐 **Web-native**: Works with standard web infrastructure

### Generated File Structure
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

### Catalog Format
Catalogs contain **references** to independent criteria instead of embedding them:

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

### Content Negotiation
The development server supports content negotiation:
- **Browsers** (Accept: text/html) → HTML version
- **API clients** (Accept: application/json) → JSON version
- **Direct file access** → `.html` or `.json` extensions work

## Quick Start

To view and explore the SVC files:

1. Install dependencies: `npm install`
2. Start the development server: `npm run serve -- --verbose`
3. Navigate to `http://localhost:3000/` to explore catalogs and criteria

**Note:** The `dist/` directory already contains pre-generated content, so you can start exploring immediately. To work with different catalogs, see the complete workflow below.

## Complete Workflow

For local development with working criterion links:

### Step 1: Rebase URLs (for localhost development)
```bash
# Rebase URLs to localhost in the source catalog BEFORE transformation
npm run rebase-urls \
  catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json -- \
  -f "https://responsiblebusiness.org" \
  -t "http://localhost:3000" \
  -o catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json
```

### Step 2: Generate Independent Structure
```bash
# Transform the localhost-rebased catalog so criteria have localhost URLs
npm run generate \
  catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json -- \
  --base-url "http://localhost:3000" \
  --verbose
```

### Step 3: Serve with Content Negotiation
```bash
# Start development server
npm run serve -- --root-dir dist --verbose
# Navigate to http://localhost:3000/ to see the discovery index
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
- **Main discovery index**: Navigate to `http://localhost:3000/` for catalog overview
- **Individual catalogs**: `http://localhost:3000/vocabulary/rba-vap-standard/8.0.2/`
- **Individual criteria**: `http://localhost:3000/criteria/prohibition-of-forced-labor/1/`
- **All URLs work** because URLs were rebased to localhost before transformation

## SVC Compliance

Each input SVC example file is linted using `jsonld lint --safe` and the schema checked with `ajv --spec=draft2020 --strict=false -c ajv-formats -s /path/to/untp-svc-schema-0.6.1.json -d example-svc-file`. But note that this is then transformed to the current individual criteria files without any regard to SVC file formats.

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
- `src/` - Tools for transforming and serving SVC files
- `dist/` - Generated output with independently versioned criteria (after running transformation)

### Available Standards

- **RBA Validated Assessment Program** - Comprehensive supply chain compliance verification
- **RMI Risk Readiness Assessment** - Responsible minerals sourcing evaluation
- **RMI Global Responsible Sourcing** - Minerals supply chain due diligence standards

### Generation of SVC input catalogs

The SVC examples in this repo were initially created with the following prompt using Claude Sonnet 4:

> Using the JSON schema, instance and context at the following URLs respectively: https://raw.githubusercontent.com/uncefact/spec-untp/refs/tags/v0.6.1/data-models/untp-svc/artefacts/untp-svc-schema.json , https://raw.githubusercontent.com/uncefact/spec-untp/refs/tags/v0.6.1/data-models/untp-svc/artefacts/untp-svc-instance.json , https://raw.githubusercontent.com/uncefact/spec-untp/refs/tags/v0.6.1/data-models/untp-svc/artefacts/context.jsonld , can you create an SVC for the attached document

and attaching the first PDF.

## CLI Tools

The repository includes several command-line tools:

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

**Generates:**
- Individual criteria files with HTML and JSON versions
- Updated catalog with criterion references
- **Main discovery index** at `dist/index.html` with links to all catalogs

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

**Features:**
- Content negotiation (HTML for browsers, JSON for APIs)
- Main discovery index at root URL showing all catalogs
- Individual criteria pages with both HTML and JSON versions
- Static file serving for production deployment compatibility

### 3. URL Rebasing CLI Tool

Transform URLs in SVC catalogs for different hosting environments, addressing the need for configurable domain names when hosting catalogs for demonstrations:

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

## Publishing Catalogs

The development server approach is designed for both local development and production deployment:

### Content Negotiation
The development server automatically handles content negotiation:
- Browsers (`Accept: text/html`) receive HTML pages
- API clients (`Accept: application/json`) receive JSON data
- Same URLs work for both human and machine consumption

### Production Deployment
1. **Generate the independent structure**: `npm run generate <catalog-file>`
2. **Serve the `dist/` directory** using any web server that supports static files
3. **Configure your web server** to serve `index.html` files by default for directories

The generated structure works with any static file server since it creates actual HTML and JSON files at predictable URLs.

### Examples

**Using the built-in server:**
```bash
npm run serve -- --port 8080
# Serves at http://localhost:8080/ with full content negotiation
```

**Using other servers:**
```bash
# Using Python 3
cd dist && python -m http.server 8080

# Using Node.js
npx serve dist -p 8080

# Using PHP
cd dist && php -S localhost:8080
```

**Production Apache example with content negotiation:**
```apache
<Directory /path/to/dist>
    DirectoryIndex index.html
    Options +FollowSymLinks +MultiViews

    # Content negotiation for catalogs and criteria
    AddType text/html .html
    AddType application/json .json

    # MultiViews automatically serves index.html or index.json
    # based on Accept header for paths like /criteria/some-criterion/1/
</Directory>
```

## About SVC

Sustainable Vocabulary Catalog (SVC) is a structured format for defining conformity schemes and their criteria. Read more at [UNTP Sustainable Vocabulary Catalog](https://uncefact.github.io/spec-untp/docs/specification/SustainabilityVocabularyCatalog).

This repository demonstrates modern SVC architecture with independently versioned criteria that provide better versioning, resolvability, and integration capabilities while maintaining compatibility with web standards.

## Requirements

- Node.js 16+ for running the development tools
- Modern web browser (Chrome, Firefox, Safari, Edge) for viewing generated content

## Troubleshooting

**Problem**: Server won't start (port in use)
**Solution**: Use a different port: `npm run serve -- --port 8080`

**Problem**: 404 errors when accessing generated content
**Solution**: Make sure you've run `npm run generate` first and are serving from the correct directory (`dist/` by default)

**Problem**: Criteria links don't work in local development
**Solution**: Use the URL rebasing workflow - rebase URLs to localhost before generation, not after

**Problem**: No catalogs appear in the discovery index
**Solution**: Ensure the catalog transformation completed successfully and check that `dist/vocabulary/` contains the generated catalog files
