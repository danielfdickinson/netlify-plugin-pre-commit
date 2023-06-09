// This is the main file for the Netlify Build plugin pre-commit.
// Please read the comments to learn more about the Netlify Build plugin syntax.
// Find more information in the Netlify documentation.

import path from 'path'
import fs from 'fs'
import { existsSync } from 'fs'
import process from 'process'
import archiver from 'archiver'

const getCacheDir = () => {
	var cacheDir
	const xdgHome = process.env.XDG_CACHE_HOME
	const userHome = process.env.HOME

	cacheDir = ''
	if (xdgHome && xdgHome != '') {
		cacheDir = xdgHome
	} else {
		cacheDir = path.join(userHome, '.cache')
	}
	cacheDir = path.join(cacheDir, 'pre-commit')
	return cacheDir
}

const getArchiveCacheDir = () => {
	var archiveDir
	const xdgHome = process.env.XDG_CACHE_HOME
	const userHome = process.env.HOME

	archiveDir = ''
	if (xdgHome && xdgHome != '') {
		archiveDir = xdgHome
	} else {
		archiveDir = path.join(userHome, '.cache')
	}
	archiveDir = path.join(archiveDir, 'pre-commit-archive')
	return archiveDir
}

const installHooks = async (run) => {
	return await run.command('pre-commit install --install-hooks -f', {
		env: 'NETLIFY=true',
	})
}

const runHooks = async (run) => {
	return await run.command('pre-commit run --all-files', {
		env: 'NETLIFY=true',
	})
}

const applyHooks = async (run, status, build) => {
	const success = await installHooks(run)
	var result = false

	if (success) {
		try {
			result = await runHooks(run)

			if (result) {
				await status.show({ summary: 'Success!' })
			} else {
				await build.failBuild('Hook run failed.')
			}
		} catch (reason) {
			await build.failBuild('Hooks installation failed', {
				reason,
			})
		}
	}

	return result
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
		// git,
		// Utility for handling Netlify Functions.
		// See https://github.com/netlify/build/tree/master/packages/functions-utils#readme
		// functions,
	},
}) {
	const preCommitConfig = path.join(process.cwd(), '.pre-commit-config.yaml')

	if (!existsSync(preCommitConfig)) {
		return status.show({ summary: 'No pre-commit config.' })
	}

	const cacheDir = getCacheDir()
	const archiveDir = getArchiveCacheDir()

	console.log(
		`Removing existing archived local user cache in "${archiveDir}"`,
	)
	fs.rmSync(archiveDir, { recursive: true, force: true })

	console.log(`Restoring user cache at "${archiveDir}"`)
	var success = false

	console.log(`Removing existing local user cache in "${cacheDir}"`)
	fs.rmSync(cacheDir, { recursive: true, force: true })

	fs.mkdirSync(cacheDir)
	const cacheCreated = true

	try {
		const restored = await cache.restore(archiveDir)
		var extracted = false
		if (restored && cacheCreated) {
			console.log('Extracting the archived local user cache')
			extracted = await run('tar', [
				'-C',
				cacheDir,
				'-xzf',
				path.join(archiveDir, 'pre-commit.tar.gz'),
			])
		}

		if (extracted) {
			console.log(`Extracted user cache directory.`)
		} else {
			console.log('No Netlify cache found for user cache directory.')
		}

		success = await applyHooks(run, status, build)
	} catch (error) {
		// Report a user error
		build.failBuild('Error message', { error })
	}

	const result = success
	console.log('Environment prepared.')
	return result
}

export const onPostBuild = async function ({
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
		// run,
		// Utility for dealing with modified, created, deleted files since a git commit.
		// See https://github.com/netlify/build/blob/master/packages/git-utils#readme
		// git,
		// Utility for handling Netlify Functions.
		// See https://github.com/netlify/build/tree/master/packages/functions-utils#readme
		// functions,
	},
}) {
	var archiveCache

	try {
		const cacheDir = getCacheDir()
		const archiveDir = getArchiveCacheDir()

		console.log(`Checking if user cache exists at "${cacheDir}"`)

		fs.mkdirSync(archiveDir, { recursive: true })

		console.log(
			`Archiving local user cache at "${cacheDir}" to "${archiveDir}/pre-commit.tar.gz"`,
		)

		const archiveOutput = fs.createWriteStream(
			path.join(archiveDir, 'pre-commit.tar.gz'),
		)
		archiveCache = archiver('tar', {
			gzip: true,
		})
		var success = false

		if (archiveCache) {
			console.log('Archive started.')
			archiveCache.on('warning', (err) => {
				if (err.code === 'ENOENT') {
					console.log('Missing file')
				} else {
					throw err
				}
			})
			archiveCache.on('error', (err) => {
				throw err
			})

			archiveCache.pipe(archiveOutput)
			archiveCache.directory(cacheDir, false)
			console.log('Finalizing archive')
			await archiveCache.finalize()
			console.log(`Archived user cache directory (step 1)`)
			success = await cache.save(archiveDir)
		}

		if (success) {
			console.log(`Saved user cache directory to Netlify cache (step 2)`)
		} else {
			console.log('No user cache directory saved to Netlify cache.')
		}
	} catch (error) {
		if (archiveCache) {
			archiveCache.abort()
		}
		// Report a user error
		await build.failBuild('Error message', { error })
	}

	// Display success information
	await status.show({ summary: 'Success!' })
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

*/

// Runs on build error or success
export const onEnd = function () {
	const archiveDir = getArchiveCacheDir()

	console.log(
		`Removing existing archived local user cache in "${archiveDir}"`,
	)
	fs.rmSync(archiveDir, { recursive: true, force: true })
}
