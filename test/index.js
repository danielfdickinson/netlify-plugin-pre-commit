import test from 'ava';
import { fileURLToPath } from 'url';

import netlifyBuild from '@netlify/build';

const NETLIFY_CONFIG = fileURLToPath(
	new URL('../netlify.toml', import.meta.url),
);

const doNetlifyBuild = async (options) => {
	return netlifyBuild(options)
};

// Unit tests are using the AVA test runner: https://github.com/avajs/ava
// A local build is performed using the following command:
//   netlify-build --config ../netlify.toml
// Please see this netlify.toml configuration file. It simply runs the
// Build plugin.
// This is a smoke test. You will probably want to write more elaborate unit
// tests to cover your plugin's logic.
test('Netlify Build should succeed repeatedly', async (t) => {
	const result = await doNetlifyBuild(
		{
			config: NETLIFY_CONFIG,
			buffer: false
		}
	)

	var success = await result.success;

	if (success) {
		const result = await doNetlifyBuild(
			{
				config: NETLIFY_CONFIG,
				buffer: false
			}
		)
		// Check that build succeeded
		t.true(await result.success);
	} else {
		t.true(false) // Force failure of test
	}
	t.true(success)
});
