// This is the main file for the Netlify Build plugin pre-commit.
// Please read the comments to learn more about the Netlify Build plugin syntax.
// Find more information in the Netlify documentation.

import path from 'path'
import fs from 'fs';
import { glob } from 'glob'
import { existsSync } from 'fs'

const getCacheDir = () => {
	const xdgHome = process.env.XDG_CACHE_HOME
	const userHome = process.env.HOME

	var cacheDir = ''
	if (xdgHome != '') {
		cacheDir = xdgHome
	} else {
		cacheDir = path.join(userHome, '.cache', 'pre-commit')
	}
	return cacheDir
}

const printList = (items) => {
	console.log('---')
	items.forEach((item) => {
		console.log(`{$index + 1}: ${item}`)
	})
}

/* eslint-disable no-unused-vars */
// The plugin main logic uses `on...` event handlers that are triggered on
// each new Netlify Build.
// Anything can be done inside those event handlers.
// Information about the current build are passed as arguments. The build
// configuration file and some core utilities are also available.
export const onPreBuild = async function ({
	// Whole configuration file. For example, content of `netlify.toml`
	netlifyConfig,
	// Users can pass configuration inputs to any plugin in their Netlify
	// configuration file.
	// For example:
	//
	// [[plugins]]
	//  package = "netlify-plugin-pre-commit"
	//  [plugins.inputs]
	//    foo = "bar"
	inputs,
	// `onError` event handlers receive the error instance as argument
	error,

	// Build constants
	constants: {
		// Path to the Netlify configuration file. `undefined` if none was used
		CONFIG_PATH,
		// Directory that contains the deploy-ready HTML files and assets
		// generated by the build. Its value is always defined, but the target
		// might not have been created yet.
		PUBLISH_DIR,
		// The directory where function source code lives.
		// `undefined` if not specified by the user.
		FUNCTIONS_SRC,
		// The directory where built serverless functions are placed before
		// deployment. Its value is always defined, but the target might not have
		// been created yet.
		FUNCTIONS_DIST,
		// Boolean indicating whether the build was run locally (Netlify CLI) or
		// in the production CI
		IS_LOCAL,
		// Version of Netlify Build as a `major.minor.patch` string
		NETLIFY_BUILD_VERSION,
		// The Netlify Site ID
		SITE_ID,
	},

	// Core utilities
	utils: {
		// Utility to report errors.
		// See https://github.com/netlify/build#error-reporting
		build,
		// Utility to display information in the deploy summary.
		// See https://github.com/netlify/build#logging
		status,
		// Utility for caching files.
		// See https://github.com/netlify/build/blob/master/packages/cache-utils#readme
		cache,
		// Utility for running commands.
		// See https://github.com/netlify/build/blob/master/packages/run-utils#readme
		run,
		// Utility for dealing with modified, created, deleted files since a git commit.
		// See https://github.com/netlify/build/blob/master/packages/git-utils#readme
		git,
		// Utility for handling Netlify Functions.
		// See https://github.com/netlify/build/tree/master/packages/functions-utils#readme
		functions,
	},
}) {
	try {
		const cacheDir = getCacheDir()
		fs.rm(cacheDir, { recursive: true, force: true})
		const cacheSuccess = await cache.restore(cacheDir)

		console.log(`Checking if user cache exists at "${cacheDir}"`)

		if (cacheSuccess) {
			console.log(
				`Restored user cache directory.`,
			)
			if (inputs.debug) printList(printList(cache.list(cacheDir)))
		} else {
			console.log('No Netlify cache found for user cache directory.')
		}

		const preCommitConfig = path.join(
			process.cwd(),
			'.pre-commit-config.yaml',
		)

		if (existsSync(preCommitConfig)) {
			await run.command('pre-commit install --install-hooks -f')
			await run.command('pre-commit run --all-files')
		}
	} catch (error) {
		// Report a user error
		build.failBuild('Error message', { error })
	}

	// Display success information
	status.show({ summary: 'Success!' })
}

export const onBuild = async function ({
	// Whole configuration file. For example, content of `netlify.toml`
	netlifyConfig,
	// Users can pass configuration inputs to any plugin in their Netlify
	// configuration file.
	// For example:
	//
	// [[plugins]]
	//  package = "netlify-plugin-pre-commit"
	//  [plugins.inputs]
	//    foo = "bar"
	inputs,
	// `onError` event handlers receive the error instance as argument
	error,

	// Build constants
	constants: {
		// Path to the Netlify configuration file. `undefined` if none was used
		CONFIG_PATH,
		// Directory that contains the deploy-ready HTML files and assets
		// generated by the build. Its value is always defined, but the target
		// might not have been created yet.
		PUBLISH_DIR,
		// The directory where function source code lives.
		// `undefined` if not specified by the user.
		FUNCTIONS_SRC,
		// The directory where built serverless functions are placed before
		// deployment. Its value is always defined, but the target might not have
		// been created yet.
		FUNCTIONS_DIST,
		// Boolean indicating whether the build was run locally (Netlify CLI) or
		// in the production CI
		IS_LOCAL,
		// Version of Netlify Build as a `major.minor.patch` string
		NETLIFY_BUILD_VERSION,
		// The Netlify Site ID
		SITE_ID,
	},

	// Core utilities
	utils: {
		// Utility to report errors.
		// See https://github.com/netlify/build#error-reporting
		build,
		// Utility to display information in the deploy summary.
		// See https://github.com/netlify/build#logging
		status,
		// Utility for caching files.
		// See https://github.com/netlify/build/blob/master/packages/cache-utils#readme
		cache,
		// Utility for running commands.
		// See https://github.com/netlify/build/blob/master/packages/run-utils#readme
		run,
		// Utility for dealing with modified, created, deleted files since a git commit.
		// See https://github.com/netlify/build/blob/master/packages/git-utils#readme
		git,
		// Utility for handling Netlify Functions.
		// See https://github.com/netlify/build/tree/master/packages/functions-utils#readme
		functions,
	},
}) {
	try {
		const cacheDir = getCacheDir()

		console.log(`Checking if user cache exists at "${cacheDir}"`)

		const success = await cache.save(cacheDir)

		if (success) {
			console.log(
				`Saved user cache directory to Netlify cache`,
			)

			if (inputs.debug) {
				const cached = await cache.list(cacheDir)

				const cachedFiles = [
					...new Set(
						cached
							.map((c) => glob.sync(`${c}/**/*`, { nodir: true }))
							.flat(),
					),
				]

				printList(cachedFiles)
			}
		} else {
			console.log('No user cache directory saved to Netlify cache.')
		}
	} catch (error) {
		// Report a user error
		build.failBuild('Error message', { error })
	}

	// Display success information
	status.show({ summary: 'Success!' })
}

// Other available event handlers
/*

// Before build commands are executed
export const onPreBuild = function () {}

// Build commands are executed
export const onBuild = function () {}

// After Build commands are executed
export const onPostBuild = function () {}

// Runs on build success
export const onSuccess = function () {}

// Runs on build error
export const onError = function () {}

// Runs on build error or success
export const onEnd = function () {}

*/
