#!/bin/bash

# ==============================================================================
# DeFi Valley Setup Verification Script
# ==============================================================================
#
# Run this script from the root of your project to check if the Tailwind CSS
# and shadcn/ui cleanup and re-installation were successful.
#
# Usage:
# ./verify_setup.sh
#
# ==============================================================================

# --- Helper Functions ---
# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print a check result
check() {
    local message=$1
    local status=$2
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✔${NC} ${message}"
    else
        echo -e "${RED}✖${NC} ${message}"
        ALL_CHECKS_PASS=false
    fi
}

# --- Main Script ---
ALL_CHECKS_PASS=true

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
WEB_APP_DIR="$PROJECT_ROOT/apps/web"

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${YELLOW}--- Verifying Project Cleanup & Structure ---${NC}"

# 1. Check for removed directories and files
if [ ! -d "${WEB_APP_DIR}/app/components" ]; then
    check "Old component directory 'app/components' removed." "pass"
else
    check "Old component directory 'app/components' still exists." "fail"
fi

# 2. Check for consolidated component directory
if [ -d "${WEB_APP_DIR}/components" ]; then
    check "Consolidated 'components' directory exists." "pass"
else
    check "Consolidated 'components' directory not found." "fail"
fi

if [ -f "${WEB_APP_DIR}/components/Auth.tsx" ]; then
    check "Key component 'Auth.tsx' found in consolidated directory." "pass"
else
    check "Key component 'Auth.tsx' NOT found in consolidated directory." "fail"
fi


echo -e "\n${YELLOW}--- Verifying Tailwind CSS & shadcn/ui Installation ---${NC}"

# 3. Check for new configuration files
if [ -f "${WEB_APP_DIR}/tailwind.config.js" ]; then
    check "'tailwind.config.js' exists." "pass"
else
    check "'tailwind.config.js' is missing." "fail"
fi

if [ -f "${WEB_APP_DIR}/postcss.config.js" ]; then
    check "'postcss.config.js' exists." "pass"
else
    check "'postcss.config.js' is missing." "fail"
fi

if [ -f "${WEB_APP_DIR}/components.json" ]; then
    check "'components.json' for shadcn/ui exists." "pass"
else
    check "'components.json' for shadcn/ui is missing." "fail"
fi

if [ -f "${WEB_APP_DIR}/lib/utils.ts" ]; then
    check "shadcn/ui utility file 'lib/utils.ts' exists." "pass"
else
    check "shadcn/ui utility file 'lib/utils.ts' is missing." "fail"
fi

# 4. Check globals.css for Tailwind import
if grep -q '@import "tailwindcss";' "${WEB_APP_DIR}/app/globals.css"; then
    check "'globals.css' contains Tailwind import." "pass"
else
    check "'globals.css' is missing the Tailwind import." "fail"
fi

# 5. Check package.json for dependencies
PACKAGE_JSON="${WEB_APP_DIR}/package.json"
if [ -f "$PACKAGE_JSON" ]; then
    if grep -q '"tailwindcss":' "$PACKAGE_JSON"; then
        check "'tailwindcss' is listed in package.json." "pass"
    else
        check "'tailwindcss' is NOT listed in package.json." "fail"
    fi

    if grep -q '"tw-animate-css":' "$PACKAGE_JSON"; then
        check "'tw-animate-css' is listed in package.json." "pass"
    else
        check "'tw-animate-css' is NOT listed in package.json." "fail"
    fi
else
    check "Could not find 'apps/web/package.json'." "fail"
fi


# --- Final Summary ---
echo ""
if [ "$ALL_CHECKS_PASS" = true ]; then
    echo -e "${GREEN}🎉 All checks passed! Your project setup looks correct.${NC}"
else
    echo -e "${RED}⚠️ Some checks failed. Please review the output above and correct the issues.${NC}"
fi
echo ""