import { rename, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import path from "node:path";
import process from "node:process";

const defaultSwaggerConfigUrl =
	"https://localhost:8443/fineract-provider/api-docs/swagger-config";
const outputPath = path.resolve("src/lib/fineract/openapi/fineract.json");

function shouldRejectUnauthorized(url) {
	if (process.env.FINERACT_OPENAPI_TLS_REJECT_UNAUTHORIZED) {
		return process.env.FINERACT_OPENAPI_TLS_REJECT_UNAUTHORIZED !== "false";
	}

	return !["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
}

function buildHeaders() {
	const headers = {
		Accept: "application/json",
	};
	const username = process.env.FINERACT_OPENAPI_USERNAME;
	const password = process.env.FINERACT_OPENAPI_PASSWORD;

	if (username && password) {
		headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
	}

	return headers;
}

function fetchJson(url) {
	const requestUrl = new URL(url);
	const transport =
		requestUrl.protocol === "https:" ? httpsRequest : httpRequest;

	return new Promise((resolve, reject) => {
		const request = transport(
			requestUrl,
			{
				headers: buildHeaders(),
				rejectUnauthorized: shouldRejectUnauthorized(requestUrl),
			},
			(response) => {
				let body = "";

				response.setEncoding("utf8");
				response.on("data", (chunk) => {
					body += chunk;
				});
				response.on("end", () => {
					if (!response.statusCode || response.statusCode >= 400) {
						reject(
							new Error(
								`GET ${requestUrl.href} failed with ${response.statusCode}: ${body.slice(0, 300)}`,
							),
						);
						return;
					}

					try {
						resolve(JSON.parse(body));
					} catch (error) {
						reject(
							new Error(
								`GET ${requestUrl.href} did not return JSON: ${error.message}`,
							),
						);
					}
				});
			},
		);

		request.on("error", reject);
		request.end();
	});
}

async function resolveOpenApiUrl() {
	if (process.env.FINERACT_OPENAPI_URL) {
		return new URL(process.env.FINERACT_OPENAPI_URL);
	}

	const configUrl = new URL(
		process.env.FINERACT_SWAGGER_CONFIG_URL ?? defaultSwaggerConfigUrl,
	);
	const swaggerConfig = await fetchJson(configUrl);

	if (
		!swaggerConfig ||
		typeof swaggerConfig !== "object" ||
		typeof swaggerConfig.url !== "string"
	) {
		throw new Error(
			`Swagger config at ${configUrl.href} did not include an OpenAPI url field.`,
		);
	}

	return new URL(swaggerConfig.url, configUrl);
}

function validateOpenApiSpec(spec, sourceUrl) {
	if (!spec || typeof spec !== "object") {
		throw new Error(
			`OpenAPI response from ${sourceUrl.href} was not an object.`,
		);
	}

	if (!spec.openapi || typeof spec.openapi !== "string") {
		throw new Error(
			`OpenAPI response from ${sourceUrl.href} is missing openapi.`,
		);
	}

	if (!spec.paths || typeof spec.paths !== "object") {
		throw new Error(
			`OpenAPI response from ${sourceUrl.href} is missing paths.`,
		);
	}

	const pathNames = Object.keys(spec.paths);
	if (pathNames.length === 0) {
		throw new Error(
			`OpenAPI response from ${sourceUrl.href} has no paths; refusing to overwrite ${outputPath}.`,
		);
	}

	if (!pathNames.includes("/v1/clients")) {
		throw new Error(
			`OpenAPI response from ${sourceUrl.href} does not include /v1/clients; refusing to overwrite ${outputPath}.`,
		);
	}
}

async function main() {
	const openApiUrl = await resolveOpenApiUrl();
	const spec = await fetchJson(openApiUrl);
	validateOpenApiSpec(spec, openApiUrl);

	const tempPath = `${outputPath}.tmp`;
	await writeFile(tempPath, `${JSON.stringify(spec, null, "\t")}\n`);
	await rename(tempPath, outputPath);

	console.log(`Updated ${outputPath} from ${openApiUrl.href}.`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
