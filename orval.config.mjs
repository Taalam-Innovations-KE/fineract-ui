import { defineConfig } from "orval";

export default defineConfig({
	fineract: {
		input: {
			target: "src/lib/fineract/openapi/fineract.json",
			override: {
				transformer: "scripts/fineract-openapi-transformer.mjs",
			},
		},
		output: {
			target: "src/lib/fineract/generated/types.gen.ts",
			client: "fetch",
			mode: "single",
			clean: true,
		},
	},
});
