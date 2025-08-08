#!/bin/bash

# SVC Independent Criteria Demo
# This script demonstrates the transformation from monolithic SVC catalogs
# to independently versioned criteria, addressing GitHub issues #2 and #3

set -e

echo "🎯 SVC Independent Criteria Transformation Demo"
echo "=============================================="
echo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Step 1: Show current monolithic structure
print_step 1 "Examining monolithic SVC catalog"
print_info "Current structure has criteria embedded in the catalog with versioned paths like:"
print_info "https://responsiblebusiness.org/vocabulary/rba-vap-standard/8.0.2/A1"
echo

if [ ! -f "catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json" ]; then
    echo "❌ Original catalog file not found!"
    exit 1
fi

catalog_size=$(du -h catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json | cut -f1)
criteria_count=$(jq '.conformityCriterion | length' catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json)
print_info "Original catalog: ${catalog_size}, contains ${criteria_count} criteria"
echo

# Step 2: Rebase URLs for localhost development BEFORE transformation
print_step 2 "Rebasing URLs for localhost development"
print_info "Rebasing URLs from https://responsiblebusiness.org to http://localhost:3001 in source catalog"
print_info "This ensures generated criteria have localhost URLs from the start"
echo

if ! node src/rebase-urls.js \
    catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2.json \
    -f "https://responsiblebusiness.org" \
    -t "http://localhost:3001" \
    -o catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json; then
    echo "❌ URL rebasing failed!"
    exit 1
fi

print_success "URLs rebased for local development!"

# Step 3: Transform to independent criteria (using localhost-rebased catalog)
print_step 3 "Transforming to independent criteria"
print_info "Running: npm run generate with localhost-rebased catalog"
echo

if ! npm run generate \
    catalogs/ResponsibleBusinessAlliance/ValidatedAssessmentProgram-8.0.2-localhost.json -- \
    --output-dir demo-output \
    --base-url "http://localhost:3001" \
    --verbose; then
    echo "❌ SVC generation failed!"
    exit 1
fi

print_success "Transformation completed!"

# Step 4: Show the new structure
print_step 4 "Examining the new independent structure"
echo

if [ -d "demo-output" ]; then
    total_files=$(find demo-output -name "index.*" | wc -l)
    criteria_dirs=$(find demo-output/criteria -mindepth 2 -maxdepth 2 -type d | wc -l)

    print_info "Generated structure:"
        print_info "  📁 Total index files: ${total_files}"
        print_info "  📁 Independent criteria: ${criteria_dirs}"
        print_info "  📁 Each criterion has both HTML and JSON versions"
        print_info "  🏠 Main index page created for catalog discovery"
    echo

    print_info "Sample criteria URLs (now independent of catalog version):"
    find demo-output/criteria -mindepth 2 -maxdepth 2 -type d | head -3 | while read dir; do
        criterion_path=$(echo "$dir" | sed 's|demo-output/||')
        print_info "  🔗 https://responsiblebusiness.org/${criterion_path}/"
    done
    echo
else
    echo "❌ Output directory not found!"
    exit 1
fi

# Step 5: Show updated catalog structure
print_step 5 "Examining updated catalog structure"
echo

catalog_json="demo-output/vocabulary/rba-vap-standard/8.0.2/index.json"
if [ -f "$catalog_json" ]; then
    ref_count=$(jq '[.conformityCriterion[] | select(.type[] == "CriterionReference")] | length' "$catalog_json")
    print_info "Updated catalog now contains:"
    print_info "  📋 ${ref_count} criterion references (not embedded criteria)"
    print_info "  🔗 Each reference points to an independent criterion"
    echo

    print_info "Sample criterion reference:"
    jq -r '.conformityCriterion[0] | "  ID: " + .id + "\n  Name: " + .name + "\n  Version: " + .version' "$catalog_json"
    echo
else
    echo "❌ Updated catalog not found!"
    exit 1
fi

# Step 6: Demonstrate content negotiation
print_step 6 "Starting development server with content negotiation"
echo

print_info "Starting server on http://localhost:3001..."
print_info "The server supports content negotiation:"
print_info "  📄 Browsers get HTML versions"
print_info "  🔧 API clients get JSON versions"
print_info "  🔗 Index.html files are served by default for directories"
echo

# Start the server in the background
npm run serve -- --root-dir demo-output --port 3001 --verbose &
SERVER_PID=$!

# Give server time to start
sleep 2

# Test content negotiation
print_info "Testing content negotiation..."
echo

if command -v curl >/dev/null 2>&1; then
    print_info "Testing JSON response (Accept: application/json):"
    if curl -s -H "Accept: application/json" "http://localhost:3001/criteria/prohibition-of-forced-labor/1/" | jq -r '.name' 2>/dev/null; then
        echo
    else
        print_info "Could not fetch JSON (server may still be starting)"
        echo
    fi

    print_info "Testing HTML response (Accept: text/html):"
    html_title=$(curl -s -H "Accept: text/html" "http://localhost:3001/criteria/prohibition-of-forced-labor/1/" | grep -o '<title>[^<]*</title>' | sed 's/<title>\(.*\)<\/title>/\1/' 2>/dev/null || echo "Could not fetch HTML title")
    print_info "HTML page title: ${html_title}"
    echo
else
    print_info "curl not available for testing, but server is running"
    echo
fi

# Step 7: Show the benefits
print_step 7 "Benefits of Independent Criteria"
echo

print_info "✨ Key advantages of the new structure:"
print_info "  🔄 Criteria can be versioned independently of catalogs"
print_info "  🔗 Stable URLs that don't change with catalog updates"
print_info "  📱 Content negotiation (HTML for humans, JSON for APIs)"
print_info "  🌐 Resolvable URLs for each criterion"
print_info "  📈 Easier to track criterion evolution over time"
print_info "  🔧 Better for API integration and tooling"
print_info "  🏠 Index.html served by default (no directory listings)"
echo

# Step 8: Show viewer
print_step 8 "SVC Viewer v2 Demo"
echo

print_info "The new viewer (svc-viewer-v2.html) supports:"
print_info "  📋 Loading catalogs with criterion references"
print_info "  🔗 Fetching individual criteria from their URLs"
print_info "  📱 Both file upload and URL loading"
print_info "  🎯 Visual distinction between embedded and independent criteria"
echo

if [ -f "svc-viewer-v2.html" ]; then
    print_info "To test the viewer:"
    print_info "  1. Copy the transformed catalog: cp demo-output/vocabulary/rba-vap-standard/8.0.2/index.json catalog.json"
    print_info "  2. Open svc-viewer-v2.html in your browser"
    print_info "  3. The viewer will auto-load catalog.json and fetch criteria from localhost:3001"
    print_info "  4. Criterion links now work because URLs are rebased to localhost"
    echo
else
    print_info "Viewer file not found at svc-viewer-v2.html"
    echo
fi

# Cleanup
print_info "Stopping development server..."
kill $SERVER_PID 2>/dev/null || true

print_success "Demo completed! 🎉"
echo
print_info "Generated files are in: demo-output/"
print_info "Main index page: demo-output/index.html"
print_info "To serve them: npm run serve -- --root-dir demo-output"
print_info "Then visit http://localhost:3000/ to explore catalogs and criteria"
print_info "To clean up: rm -rf demo-output/"
echo

echo "🔗 GitHub Issues Addressed:"
echo "   #2: Criteria are now versioned separately from catalogs"
echo "   #3: Each criterion ID resolves to its own page with content negotiation"
echo "   Plus: URL rebasing enables local development with working criterion links"
echo
