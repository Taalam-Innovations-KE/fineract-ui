export default function transformFineractOpenApi(schema) {
	const collateralDelete =
		schema.paths?.["/v1/loan-collateral-management/{id}"]?.delete;
	if (collateralDelete?.parameters) {
		collateralDelete.parameters = collateralDelete.parameters.filter(
			(parameter) =>
				!(
					parameter &&
					typeof parameter === "object" &&
					parameter.in === "path" &&
					parameter.name === "loanId"
				),
		);
	}

	const selfShareGet =
		schema.paths?.["/v1/self/products/share/{productId}"]?.get;
	const typeParameter = selfShareGet?.parameters?.find(
		(parameter) =>
			parameter &&
			typeof parameter === "object" &&
			parameter.in === "path" &&
			parameter.name === "type",
	);
	if (typeParameter && typeof typeParameter === "object") {
		typeParameter.in = "query";
		delete typeParameter.required;
	}

	return schema;
}
