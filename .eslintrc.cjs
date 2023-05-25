module.exports = {
	root: true,
	env: {
		node: true,
		es6: true,
	},
	extends: [
		'eslint:recommended',
		'prettier',
		'plugin:ava/recommended',
		'plugin:@typescript-eslint/recommended',
	],
	plugins: ['@typescript-eslint', 'ava', 'prettier'],
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module',
	},
	rules: {
		'@typescript-eslint/no-unused-vars': 0,
	},
}
