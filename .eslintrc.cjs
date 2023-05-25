module.exports = {
	root: true,
	env: {
		node: true,
		es6: true,
	},
	extends: ['eslint:recommended', 'prettier', 'plugin:ava/recommended'],
	plugins: ['ava', 'prettier'],
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module',
	},
}
