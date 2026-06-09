#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "Serving spiro-website at http://localhost:8000"
echo "  Theme lab → http://localhost:8000/theme-lab.html"
echo "  Homepage  → http://localhost:8000/"
echo "Press Ctrl+C to stop."
python3 -m http.server 8000
