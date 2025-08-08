#!/usr/bin/env node

/**
 * SVC Generator - Transform monolithic SVC catalogs into independently versioned criteria
 *
 * This script takes a monolithic SVC catalog file and generates:
 * - Individual criteria files in a structured directory
 * - Updated catalog that references independent criteria
 * - HTML and JSON versions of each criterion for content negotiation
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class SVCGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || "dist";
    this.baseUrl = options.baseUrl; // Will be detected from source catalog if not provided
    this.criteriaPath = options.criteriaPath || "criteria";
    this.catalogPath = options.catalogPath || "vocabulary";
    this.verbose = options.verbose || false;
  }

  /**
   * Generate independent criteria structure from monolithic catalog
   */
  async generateFromCatalog(catalogPath) {
    try {
      const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
      this.log(`Processing catalog: ${catalogData.scheme?.name || "Unknown"}`);

      // Detect base URL from catalog if not provided
      if (!this.baseUrl) {
        this.baseUrl = this.detectBaseUrl(catalogData);
        this.log(`Detected base URL: ${this.baseUrl}`);
      }

      // Create output directories
      this.ensureDir(this.outputDir);
      this.ensureDir(path.join(this.outputDir, this.criteriaPath));
      this.ensureDir(path.join(this.outputDir, this.catalogPath));

      // Extract and process criteria
      const criteriaMap = new Map();
      const processedCatalog = await this.processCatalog(
        catalogData,
        criteriaMap,
      );

      // Generate individual criteria files
      await this.generateCriteriaFiles(criteriaMap);

      // Generate updated catalog
      await this.generateCatalogFiles(processedCatalog);

      // Generate main index page
      await this.generateMainIndex();

      this.log(`Generated ${criteriaMap.size} criteria and updated catalog`);

      return {
        criteria: Array.from(criteriaMap.keys()),
        catalog: processedCatalog.id,
      };
    } catch (error) {
      throw new Error(`Failed to generate SVC: ${error.message}`);
    }
  }

  /**
   * Detect base URL from catalog ID
   */
  detectBaseUrl(catalogData) {
    if (catalogData.id) {
      try {
        const url = new URL(catalogData.id);
        return `${url.protocol}//${url.host}`;
      } catch (error) {
        this.log(
          `Warning: Could not parse catalog ID as URL: ${catalogData.id}`,
        );
      }
    }

    // Fallback to default if detection fails
    this.log("Warning: Could not detect base URL from catalog, using default");
    return "https://responsiblebusiness.org";
  }

  /**
   * Process catalog and extract criteria with independent IDs
   */
  async processCatalog(catalog, criteriaMap) {
    const processedCatalog = JSON.parse(JSON.stringify(catalog)); // Deep clone

    // Process conformity criteria
    if (processedCatalog.conformityCriterion) {
      processedCatalog.conformityCriterion = await Promise.all(
        processedCatalog.conformityCriterion.map((criterion) =>
          this.processCriterion(criterion, criteriaMap),
        ),
      );
    }

    return processedCatalog;
  }

  /**
   * Process individual criterion and assign independent ID
   */
  async processCriterion(criterion, criteriaMap) {
    // Generate independent ID for criterion
    const criterionSlug = this.generateSlug(criterion.name);
    const criterionVersion = this.determineCriterionVersion(criterion);
    const independentId = `${this.baseUrl}/${this.criteriaPath}/${criterionSlug}/${criterionVersion}/`;

    // Create independent criterion object
    const independentCriterion = {
      ...criterion,
      id: independentId,
      originalId: criterion.id, // Keep reference to original ID
    };

    // Process sub-criteria recursively
    if (criterion.subCriterion) {
      independentCriterion.subCriterion = await Promise.all(
        criterion.subCriterion.map((subCrit) =>
          this.processCriterion(subCrit, criteriaMap),
        ),
      );
    }

    // Store the criterion for file generation
    criteriaMap.set(independentId, independentCriterion);

    // Return reference object for the catalog
    return {
      type: ["CriterionReference"],
      id: independentId,
      name: criterion.name,
      version: criterionVersion,
    };
  }

  /**
   * Generate slug from criterion name
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Determine version for criterion based on content
   */
  determineCriterionVersion(criterion) {
    // For now, start all criteria at version 1
    // In the future, this could hash content to detect changes
    // or use existing version information if available
    return criterion.version || "1";
  }

  /**
   * Generate individual files for each criterion
   */
  async generateCriteriaFiles(criteriaMap) {
    for (const [criterionId, criterion] of criteriaMap) {
      const urlPath = new URL(criterionId).pathname;
      const filePath = path.join(this.outputDir, urlPath);

      this.ensureDir(filePath);

      // Generate JSON file
      const jsonPath = path.join(filePath, "index.json");
      fs.writeFileSync(jsonPath, JSON.stringify(criterion, null, 2));

      // Generate HTML file
      const htmlPath = path.join(filePath, "index.html");
      const htmlContent = this.generateCriterionHTML(criterion);
      fs.writeFileSync(htmlPath, htmlContent);

      this.log(`Generated criterion: ${criterionId}`);
    }
  }

  /**
   * Generate HTML representation of criterion
   */
  generateCriterionHTML(criterion) {
    const title = criterion.name || "Criterion";
    const description = criterion.description || "";
    const conformityTopic = criterion.conformityTopic || "";
    const status = criterion.status || "";

    // Generate sub-criteria HTML if present
    let subCriteriaHtml = "";
    if (criterion.subCriterion && criterion.subCriterion.length > 0) {
      subCriteriaHtml = `
                <section class="sub-criteria">
                    <h2>Sub-criteria</h2>
                    <ul>
                        ${criterion.subCriterion
                          .map(
                            (sub) => `
                            <li>
                                <a href="${sub.id}" class="criterion-link">
                                    ${sub.name} (v${sub.version})
                                </a>
                            </li>
                        `,
                          )
                          .join("")}
                    </ul>
                </section>
            `;
    }

    // Generate categories HTML if present
    let categoriesHtml = "";
    if (criterion.category && criterion.category.length > 0) {
      categoriesHtml = `
                <section class="categories">
                    <h2>Categories</h2>
                    <ul>
                        ${criterion.category
                          .map(
                            (cat) => `
                            <li>
                                <strong>${cat.code}:</strong> ${cat.name}
                                <br><em>${cat.schemeName}</em>
                            </li>
                        `,
                          )
                          .join("")}
                    </ul>
                </section>
            `;
    }

    // Generate tags HTML if present
    let tagsHtml = "";
    if (criterion.tag && criterion.tag.length > 0) {
      tagsHtml = `
                <section class="tags">
                    <h2>Tags</h2>
                    <div class="tag-list">
                        ${criterion.tag.map((tag) => `<span class="tag">${tag}</span>`).join("")}
                    </div>
                </section>
            `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #24292f;
        }

        .criterion-header {
            border-bottom: 2px solid #d0d7de;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }

        .criterion-meta {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
            flex-wrap: wrap;
        }

        .meta-item {
            background: #f6f8fa;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.875rem;
        }

        .criterion-link {
            color: #0969da;
            text-decoration: none;
        }

        .criterion-link:hover {
            text-decoration: underline;
        }

        .tag {
            background: #ddf4ff;
            color: #0969da;
            padding: 0.25rem 0.5rem;
            border-radius: 0.5rem;
            font-size: 0.75rem;
            margin-right: 0.5rem;
        }

        .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        section {
            margin: 2rem 0;
        }

        .json-link {
            float: right;
            background: #f6f8fa;
            border: 1px solid #d0d7de;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            text-decoration: none;
            color: #24292f;
            font-size: 0.875rem;
        }

        .json-link:hover {
            background: #f3f4f6;
        }
    </style>
    <link rel="alternate" type="application/json" href="./index.json" title="JSON representation">
</head>
<body>
    <a href="./index.json" class="json-link">View JSON</a>

    <div class="criterion-header">
        <h1>${title}</h1>
        <div class="criterion-meta">
            ${status ? `<span class="meta-item">Status: ${status}</span>` : ""}
            ${conformityTopic ? `<span class="meta-item">Topic: ${conformityTopic}</span>` : ""}
            <span class="meta-item">Version: ${criterion.version || "1"}</span>
        </div>
    </div>

    ${
      description
        ? `
        <section class="description">
            <h2>Description</h2>
            <p>${description}</p>
        </section>
    `
        : ""
    }

    ${subCriteriaHtml}
    ${categoriesHtml}
    ${tagsHtml}

    <section class="json-data">
        <h2>JSON Data</h2>
        <p><a href="./index.json" class="criterion-link">Download as JSON</a></p>
    </section>
</body>
</html>`;
  }

  /**
   * Generate updated catalog files
   */
  async generateCatalogFiles(catalog) {
    const urlPath = new URL(catalog.id).pathname;
    const filePath = path.join(this.outputDir, urlPath);

    this.ensureDir(filePath);

    // Generate JSON file
    const jsonPath = path.join(filePath, "index.json");
    fs.writeFileSync(jsonPath, JSON.stringify(catalog, null, 2));

    // Generate HTML file
    const htmlPath = path.join(filePath, "index.html");
    const htmlContent = this.generateCatalogHTML(catalog);
    fs.writeFileSync(htmlPath, htmlContent);

    this.log(`Generated catalog: ${catalog.id}`);
  }

  /**
   * Generate HTML representation of catalog
   */
  generateCatalogHTML(catalog) {
    const title = catalog.scheme?.name || "SVC Catalog";
    const description = catalog.scheme?.description || "";
    const version = catalog.scheme?.version || "";

    let criteriaHtml = "";
    if (catalog.conformityCriterion && catalog.conformityCriterion.length > 0) {
      criteriaHtml = `
                <section class="criteria">
                    <h2>Conformity Criteria</h2>
                    <ul>
                        ${catalog.conformityCriterion
                          .map(
                            (crit) => `
                            <li>
                                <a href="${crit.id}" class="criterion-link">
                                    ${crit.name} (v${crit.version})
                                </a>
                            </li>
                        `,
                          )
                          .join("")}
                    </ul>
                </section>
            `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #24292f;
        }

        .catalog-header {
            border-bottom: 2px solid #d0d7de;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }

        .criterion-link {
            color: #0969da;
            text-decoration: none;
        }

        .criterion-link:hover {
            text-decoration: underline;
        }

        .json-link {
            float: right;
            background: #f6f8fa;
            border: 1px solid #d0d7de;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            text-decoration: none;
            color: #24292f;
            font-size: 0.875rem;
        }

        .json-link:hover {
            background: #f3f4f6;
        }

        section {
            margin: 2rem 0;
        }

        .version {
            color: #656d76;
            font-size: 0.875rem;
        }
    </style>
    <link rel="alternate" type="application/json" href="./index.json" title="JSON representation">
</head>
<body>
    <a href="./index.json" class="json-link">View JSON</a>

    <div class="catalog-header">
        <h1>${title}</h1>
        ${version ? `<div class="version">Version: ${version}</div>` : ""}
    </div>

    ${
      description
        ? `
        <section class="description">
            <h2>Description</h2>
            <p>${description}</p>
        </section>
    `
        : ""
    }

    ${criteriaHtml}

    <section class="json-data">
        <h2>JSON Data</h2>
        <p><a href="./index.json" class="criterion-link">Download as JSON</a></p>
    </section>
</body>
</html>`;
  }

  /**
   * Ensure directory exists
   */
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate main index.html with links to available catalogs
   */
  async generateMainIndex() {
    const indexPath = path.join(this.outputDir, "index.html");

    // Scan for available catalogs
    const catalogs = [];
    const vocabularyDir = path.join(this.outputDir, this.catalogPath);

    if (fs.existsSync(vocabularyDir)) {
      const scanDir = (dir, basePath = "") => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            const indexJson = path.join(itemPath, "index.json");
            if (fs.existsSync(indexJson)) {
              // This is a catalog directory
              const relativePath = path.join(basePath, item);
              try {
                const catalogData = JSON.parse(
                  fs.readFileSync(indexJson, "utf8"),
                );
                catalogs.push({
                  name: catalogData.scheme?.name || item,
                  description: catalogData.scheme?.description || "",
                  version: catalogData.scheme?.version || "",
                  path: relativePath,
                  id: catalogData.id || "",
                });
              } catch (error) {
                this.log(`Warning: Could not read catalog at ${indexJson}`);
              }
            } else {
              // Recurse into subdirectory
              scanDir(itemPath, path.join(basePath, item));
            }
          }
        }
      };

      scanDir(vocabularyDir);
    }

    // Count criteria
    const criteriaDir = path.join(this.outputDir, this.criteriaPath);
    let criteriaCount = 0;
    if (fs.existsSync(criteriaDir)) {
      const countCriteria = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            const subItems = fs.readdirSync(itemPath);
            for (const subItem of subItems) {
              const subItemPath = path.join(itemPath, subItem);
              if (
                fs.statSync(subItemPath).isDirectory() &&
                fs.existsSync(path.join(subItemPath, "index.json"))
              ) {
                criteriaCount++;
              }
            }
          }
        }
      };

      countCriteria(criteriaDir);
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SVC Independent Criteria - Generated Catalogs</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
            background: #f8f9fa;
        }

        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 0.5rem;
        }

        .header-info {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1.5rem 0;
        }

        .stat-card {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 6px;
            text-align: center;
            border-left: 4px solid #3498db;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
        }

        .stat-label {
            color: #7f8c8d;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .catalog-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }

        .catalog-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .catalog-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .catalog-title {
            color: #2c3e50;
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
        }

        .catalog-version {
            color: #7f8c8d;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }

        .catalog-description {
            color: #555;
            margin-bottom: 1.5rem;
            line-height: 1.5;
        }

        .catalog-links {
            display: flex;
            gap: 1rem;
        }

        .catalog-link {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            text-decoration: none;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .catalog-link.html {
            background: #3498db;
            color: white;
        }

        .catalog-link.html:hover {
            background: #2980b9;
        }

        .catalog-link.json {
            background: #95a5a6;
            color: white;
        }

        .catalog-link.json:hover {
            background: #7f8c8d;
        }

        .empty-state {
            text-align: center;
            padding: 3rem;
            color: #7f8c8d;
        }

        .footer-info {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 2rem;
            font-size: 0.875rem;
            color: #7f8c8d;
        }

        .footer-info h3 {
            color: #2c3e50;
            margin-top: 0;
        }
    </style>
</head>
<body>
    <h1>🎯 SVC Independent Criteria</h1>

    <div class="header-info">
        <p>This directory contains independently versioned criteria generated from SVC catalogs. Each criterion has its own URL and can be versioned separately from the catalog.</p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${catalogs.length}</div>
                <div class="stat-label">Catalog${catalogs.length !== 1 ? "s" : ""}</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${criteriaCount}</div>
                <div class="stat-label">Independent Criteria</div>
            </div>
        </div>
    </div>

    ${
      catalogs.length > 0
        ? `
    <div class="catalog-grid">
        ${catalogs
          .map(
            (catalog) => `
        <div class="catalog-card">
            <h2 class="catalog-title">${catalog.name}</h2>
            ${catalog.version ? `<div class="catalog-version">Version: ${catalog.version}</div>` : ""}
            ${catalog.description ? `<div class="catalog-description">${catalog.description}</div>` : ""}

            <div class="catalog-links">
                <a href="${this.catalogPath}/${catalog.path}/" class="catalog-link html">
                    📄 View HTML
                </a>
                <a href="${this.catalogPath}/${catalog.path}/index.json" class="catalog-link json">
                    📋 View JSON
                </a>
            </div>
        </div>
        `,
          )
          .join("")}
    </div>
    `
        : `
    <div class="empty-state">
        <h2>No catalogs found</h2>
        <p>Run the SVC generator to create catalogs with independent criteria.</p>
    </div>
    `
    }

    <div class="footer-info">
        <h3>About Independent Criteria</h3>
        <p><strong>🔄 Independent Versioning:</strong> Criteria can be updated without changing catalog versions</p>
        <p><strong>🔗 Resolvable URLs:</strong> Each criterion has its own URL that serves actual content</p>
        <p><strong>📱 Content Negotiation:</strong> URLs serve HTML for browsers, JSON for APIs</p>
        <p><strong>🌐 Web Standards:</strong> Built using standard web technologies for maximum compatibility</p>

        <p style="margin-top: 1.5rem;">
            Generated criteria can be found at: <code>${this.criteriaPath}/</code><br>
            Each criterion URL pattern: <code>${this.criteriaPath}/{criterion-name}/{version}/</code>
        </p>
    </div>
</body>
</html>`;

    fs.writeFileSync(indexPath, htmlContent);
    this.log(`Generated main index: ${indexPath}`);
  }

  /**
   * Log message if verbose mode is enabled
   */
  log(message) {
    if (this.verbose) {
      console.log(`[SVC Generator] ${message}`);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(`
Usage: node svc-generator.js <catalog-file> [options]

Options:
  --output-dir <dir>     Output directory (default: dist)
  --base-url <url>       Base URL for generated IDs (default: https://responsiblebusiness.org)
  --criteria-path <path> Path for criteria (default: criteria)
  --catalog-path <path>  Path for catalog (default: vocabulary)
  --verbose              Enable verbose logging

Example:
  node svc-generator.js ../catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json --verbose
        `);
    process.exit(1);
  }

  const catalogFile = args[0];
  const options = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--output-dir":
        options.outputDir = args[++i];
        break;
      case "--base-url":
        options.baseUrl = args[++i];
        break;
      case "--criteria-path":
        options.criteriaPath = args[++i];
        break;
      case "--catalog-path":
        options.catalogPath = args[++i];
        break;
      case "--verbose":
        options.verbose = true;
        break;
    }
  }

  const generator = new SVCGenerator(options);

  generator
    .generateFromCatalog(catalogFile)
    .then((result) => {
      console.log("✅ SVC generation completed successfully!");
      console.log(`📁 Generated ${result.criteria.length} criteria`);
      console.log(`📋 Updated catalog: ${result.catalog}`);
      console.log(`📂 Output directory: ${generator.outputDir}`);
    })
    .catch((error) => {
      console.error("❌ SVC generation failed:", error.message);
      process.exit(1);
    });
}

module.exports = SVCGenerator;
