#!/bin/sh
# Build both sites and serve them locally in the same shape as areg.nl:
#   /workflow/            the method page
#   /rpm-boss/workflow/   the rpm-boss docs
set -e
cd "$(dirname "$0")/.."
node scripts/build.mjs
rm -rf .preview
mkdir -p .preview/workflow .preview/rpm-boss
cp -r dist-narrative/. .preview/workflow/
cp -r dist/. .preview/rpm-boss/workflow/
echo "Serving at http://localhost:8080/workflow/ (Ctrl+C to stop)"
echo "  http://localhost:8080/workflow/            the method page"
echo "  http://localhost:8080/rpm-boss/workflow/   the rpm-boss docs"
python3 -m http.server 8080 -d .preview
