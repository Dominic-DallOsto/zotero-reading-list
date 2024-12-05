import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	prettierConfig,
	{
		ignores: [
			"**/build/**/*",
			"**/logs/**/*",
			"**/dist/**/*",
			"**/node_modules/**/*",
			"**/scripts/**/*",
			"**/*.js",
			"**/*.bak",
			"**/zotero-plugin.config.ts",
			"**/eslint.config.mjs",
		],
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			"@typescript-eslint/ban-ts-comment": [
				"warn",
				{
					"ts-expect-error": "allow-with-description",
					"ts-ignore": "allow-with-description",
					"ts-nocheck": "allow-with-description",
					"ts-check": "allow-with-description",
				},
			],

			"@typescript-eslint/no-unused-vars": "off",

			"@typescript-eslint/no-explicit-any": [
				"off",
				{
					ignoreRestArgs: true,
				},
			],

			"@typescript-eslint/no-non-null-assertion": "off",
		},
	},
);
