# Sustainable Vocabulary Catalog (SVC) Examples

This directory contains examples of Sustainable Vocabulary Catalog files and a simple viewer to display them, with the ability to drill down through criteria to whatever level is present in the SVC file.

![SVC Viewer Screenshot](doc/image/svc-viewer.png)

*The SVC Viewer displaying the RBA Validated Assessment Program standard with expandable criteria hierarchy*

## Contents

- `RBA-VAP/` - RBA Validated Assessment Program SVC files
- `svc-viewer.html` - Standalone HTML viewer for SVC JSON files

## Quick Start

To view the SVC files as interactive HTML pages:

1. Open `svc-viewer.html` in your web browser
2. Click "Select SVC JSON File" and choose any JSON file from the `RBA-VAP/` directory
3. View the interactive content with collapsible sections

**No installation required** This works offline and doesn't need Python or any web server setup.

## About SVC

Sustainable Vocabulary Catalog (SVC) is a structured format for defining conformity schemes and their criteria. Read more at [UNTP Sustainable Vocabulary Catalog](https://uncefact.github.io/spec-untp/docs/specification/SustainabilityVocabularyCatalog).

## RBA VAP

The Responsible Business Alliance (RBA) Validated Assessment Program (VAP) is a leading standard for onsite compliance verification in supply chains, focusing on:

- **Labor Standards** - Worker rights and working conditions
- **Health & Safety** - Workplace safety and employee wellbeing
- **Environmental** - Environmental management and sustainability
- **Ethics** - Business integrity and ethical practices
- **Management Systems** - Governance and continuous improvement

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)

## Troubleshooting

**Problem**: File selector doesn't work
**Solution**: Make sure you're using a modern browser. Some older browsers may not support the file API.

**Problem**: Large JSON files load slowly
**Solution**: This is normal for very large files. The viewer processes everything client-side for security.

**Problem**: Can't view files
**Solution**: Ensure the JSON files are valid. The viewer will show an error message if the JSON is malformed.
