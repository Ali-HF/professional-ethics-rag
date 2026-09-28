#!/usr/bin/env bash
# Ethica · 1-Click Study Assistant Launcher for macOS / Linux

echo "===================================================================="
echo "  Ethica - CT-268 Professional Ethics Midterm Prep Assistant"
echo "  NED University of Engineering & Technology"
echo "===================================================================="
echo ""

# Check python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install Python 3.11+."
    exit 1
fi

# Setup venv
if [ ! -d "venv" ]; then
    echo "[*] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "[*] Installing dependencies..."
pip install -r requirements.txt --quiet

# Check key
if [ ! -f ".env" ] || ! grep -q "gsk_" .env || grep -q "gsk_\.\.\." .env; then
    echo ""
    echo "--------------------------------------------------------------------"
    echo "  [!] Groq API Key Required (100% Free: https://console.groq.com/keys)"
    echo "--------------------------------------------------------------------"
    read -p "Paste your Groq API Key (starts with gsk_): " user_key
    if [ -n "$user_key" ]; then
        echo "GROQ_API_KEY=\"$user_key\"" > .env
        echo "[*] Key saved to .env!"
    fi
fi

# Ingest if chroma_db missing
if [ ! -d "chroma_db" ]; then
    echo "[*] Indexing course slides into Chroma vector store..."
    python ingest_database.py
fi

echo ""
echo "===================================================================="
echo "  Starting web application on http://localhost:7860"
echo "===================================================================="

# Open browser if possible
if command -v open &> /dev/null; then
    open "http://localhost:7860"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:7860"
fi

python server.py
