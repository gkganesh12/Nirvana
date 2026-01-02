#!/bin/bash

# SignalCraft Repository Initialization Script
# This script helps initialize the repository and set up the initial structure

set -e

echo "🚀 Initializing SignalCraft Repository..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Check if remote is set
if ! git remote | grep -q "origin"; then
    echo "🔗 Setting up remote repository..."
    git remote add origin https://github.com/gkganesh12/SignalCraft.git
    echo "✅ Remote 'origin' set to https://github.com/gkganesh12/SignalCraft.git"
fi

# Create initial directory structure
echo "📁 Creating directory structure..."
mkdir -p apps/{api,web}
mkdir -p packages/{shared,database,config}
mkdir -p docs
mkdir -p .github/workflows
mkdir -p scripts

echo "✅ Directory structure created"

# Check if README exists
if [ ! -f "README.md" ]; then
    echo "⚠️  README.md not found. Please create it."
else
    echo "✅ README.md found"
fi

# Display next steps
echo ""
echo "✨ Repository initialization complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update .gitignore if needed"
echo "2. Add your files: git add ."
echo "3. Make initial commit: git commit -m 'chore: initial repository setup'"
echo "4. Push to main: git push -u origin main"
echo ""
echo "📚 For phase completion workflow, see: .github/PHASE_COMPLETION_GUIDE.md"
echo "📝 For commit conventions, see: .github/COMMIT_CONVENTIONS.md"

