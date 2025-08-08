#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const chalk = require("chalk");

// CLI argument configuration
const argv = yargs(process.argv.slice(2))
  .usage("Usage: $0 [input-file] [options]")
  .command("$0 <input>", "Rebase URLs in an SVC catalog file", (yargs) => {
    yargs.positional("input", {
      describe: "Input SVC JSON file path",
      type: "string",
    });
  })
  .option("from", {
    alias: "f",
    type: "string",
    describe: 'Base URL to replace (e.g., "https://example.com")',
    demandOption: true,
  })
  .option("to", {
    alias: "t",
    type: "string",
    describe: 'New base URL (e.g., "https://demo.sustainablevocab.org")',
    demandOption: true,
  })
  .option("output", {
    alias: "o",
    type: "string",
    describe: "Output file path (default: stdout)",
  })

  .option("dry-run", {
    alias: "d",
    type: "boolean",
    describe: "Show what would be changed without modifying files",
    default: false,
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    describe: "Show detailed output",
    default: false,
  })
  .help()
  .alias("help", "h")
  .example(
    '$0 catalog.json -f "https://example.com" -t "https://demo.org"',
    "Replace base URL and output to stdout",
  )
  .example(
    '$0 catalog.json -f "https://example.com" -t "https://demo.org" -o output.json',
    "Replace base URL and save to file",
  )
  .example(
    '$0 catalog.json -f "https://example.com" -t "https://demo.org" -d',
    "Dry run to see what would change",
  ).argv;

// Logging functions
const log = {
  info: (msg) => console.error(chalk.blue("ℹ"), msg),
  success: (msg) => console.error(chalk.green("✓"), msg),
  warn: (msg) => console.error(chalk.yellow("⚠"), msg),
  error: (msg) => console.error(chalk.red("✗"), msg),
  verbose: (msg) => argv.verbose && console.error(chalk.gray("→"), msg),
};

// URL replacement statistics
const stats = {
  totalReplacements: 0,
  filesProcessed: 0,
  urlsFound: new Set(),
  urlsReplaced: new Set(),
};

/**
 * Recursively process an object to replace URLs
 * @param {any} obj - The object to process
 * @param {string} fromUrl - Base URL to replace
 * @param {string} toUrl - New base URL
 * @returns {any} - The processed object
 */
function replaceUrlsInObject(obj, fromUrl, toUrl) {
  if (typeof obj === "string") {
    if (obj.startsWith(fromUrl)) {
      stats.urlsFound.add(obj);
      const newUrl = obj.replace(fromUrl, toUrl);
      stats.urlsReplaced.add(newUrl);
      stats.totalReplacements++;
      log.verbose(`${chalk.dim(obj)} → ${chalk.cyan(newUrl)}`);
      return newUrl;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceUrlsInObject(item, fromUrl, toUrl));
  }

  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceUrlsInObject(value, fromUrl, toUrl);
    }
    return result;
  }

  return obj;
}

/**
 * Validate that the input and output are valid
 * @param {string} inputFile - Input file path
 * @param {string} fromUrl - Base URL to replace
 * @param {string} toUrl - New base URL
 */
function validateInputs(inputFile, fromUrl, toUrl) {
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    log.error(`Input file does not exist: ${inputFile}`);
    process.exit(1);
  }

  // Check if input file is readable
  try {
    fs.accessSync(inputFile, fs.constants.R_OK);
  } catch (error) {
    log.error(`Cannot read input file: ${inputFile}`);
    process.exit(1);
  }

  // Validate URLs
  try {
    new URL(fromUrl);
  } catch (error) {
    log.error(`Invalid 'from' URL: ${fromUrl}`);
    process.exit(1);
  }

  try {
    new URL(toUrl);
  } catch (error) {
    log.error(`Invalid 'to' URL: ${toUrl}`);
    process.exit(1);
  }
}

/**
 * Create backup file if overwriting the same file
 * @param {string} filePath - Original file path
 * @param {string} outputFile - Output file path
 */
function handleBackup(filePath, outputFile) {
  // Automatically create backup if we're overwriting the input file
  if (outputFile === filePath) {
    const backupPath = `${filePath}.bak`;
    try {
      fs.copyFileSync(filePath, backupPath);
      log.success(`Backup created: ${backupPath}`);
    } catch (error) {
      log.error(`Failed to create backup: ${error.message}`);
      process.exit(1);
    }
  }
}

/**
 * Main processing function
 */
async function main() {
  const {
    input: inputFile,
    from: fromUrl,
    to: toUrl,
    output: outputFile,
    "dry-run": dryRun,
  } = argv;

  log.info(`SVC URL Rebaser - Replacing "${fromUrl}" with "${toUrl}"`);

  // Validate inputs
  validateInputs(inputFile, fromUrl, toUrl);

  // Read and parse input file
  let inputData;
  try {
    const inputContent = fs.readFileSync(inputFile, "utf8");
    inputData = JSON.parse(inputContent);
    log.success(`Loaded SVC catalog: ${inputFile}`);
  } catch (error) {
    log.error(`Failed to read/parse input file: ${error.message}`);
    process.exit(1);
  }

  // Process the data
  log.info("Processing URL replacements...");
  const processedData = replaceUrlsInObject(inputData, fromUrl, toUrl);
  stats.filesProcessed = 1;

  // Show statistics
  log.info(`Found ${stats.urlsFound.size} URLs matching "${fromUrl}"`);
  log.info(`Made ${stats.totalReplacements} replacements`);

  if (dryRun) {
    log.warn("Dry run mode - no files were modified");
    if (argv.verbose) {
      console.error("\nURLs that would be replaced:");
      stats.urlsFound.forEach((url) => {
        const newUrl = url.replace(fromUrl, toUrl);
        console.error(`  ${chalk.dim(url)} → ${chalk.cyan(newUrl)}`);
      });
    }
    return;
  }

  if (stats.totalReplacements === 0) {
    log.warn(`No URLs found matching "${fromUrl}"`);
    return;
  }

  // Handle backup creation - automatic when overwriting
  handleBackup(inputFile, outputFile);

  // Output the result
  const outputJson = JSON.stringify(processedData, null, 2);

  if (outputFile) {
    try {
      fs.writeFileSync(outputFile, outputJson);
      log.success(`Output written to: ${outputFile}`);
    } catch (error) {
      log.error(`Failed to write output file: ${error.message}`);
      process.exit(1);
    }
  } else {
    // Output to stdout
    console.log(outputJson);
  }

  log.success(
    `Successfully rebased ${stats.totalReplacements} URLs from "${fromUrl}" to "${toUrl}"`,
  );
}

// Run the CLI
main().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  if (argv.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});
