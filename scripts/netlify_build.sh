#!/bin/bash

set -e
set -o pipefail

export PATH="${HOME}"/.local/bin:"${PATH}"

if [ "$NETLIFY" = "true" ]; then
	pip install pipx
else
	pip install --user pipx
fi
pipx install --force pre-commit

pre-commit install --install-hooks
pre-commit run --all-files

bash ./scripts/hugo-audit.sh
bash ./scripts/check-internal-links.sh

rm -rf public exampleSite/public

export HUGO_PARAMS_DEFAULTCANONICAL="$URL"

if [ "$CONTEXT" = "production" ]; then
	export HUGO_PARAMS_DEPLOYEDBASEURL="$URL"
	export BASEURL="$URL"
else
	export HUGO_PARAMS_DEPLOYEDBASEURL="$DEPLOY_PRIME_URL"
	export BASEURL="$DEPLOY_PRIME_URL"
fi

if [ -z "$BASEURL" ]; then
	export BASEURL="/"
fi

HUGO_RESOURCEDIR="$(pwd)/resources" hugo --gc --minify -b "$BASEURL" --source "$(pwd)"/exampleSite --destination "$(pwd)/public"
