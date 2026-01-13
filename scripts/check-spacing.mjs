#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);

const allowed = {
	marginPadding: new Set([
		"0",
		"0.5",
		"1",
		"1.5",
		"2",
		"2.5",
		"3",
		"3.5",
		"4",
		"5",
		"6",
		"7",
		"8",
	]),
	gap: new Set(["0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6"]),
	space: new Set(["1", "1.5", "2", "3", "4", "6", "12"]),
};

const fileViolations = new Map();

function addViolation(filePath, token, reason) {
	const entry = fileViolations.get(filePath) ?? [];
	entry.push(`${token}${reason ? ` (${reason})` : ""}`);
	fileViolations.set(filePath, entry);
}

function walk(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(fullPath);
			continue;
		}
		if (!exts.has(path.extname(entry.name))) {
			continue;
		}
		checkFile(fullPath);
	}
}

function checkFile(filePath) {
	const text = fs.readFileSync(filePath, "utf8");

	const bracketedSpacing = [
		/\b(?:m|p)[trblxy]?-\[[^\]]+\]/g,
		/\bgap(?:-x|-y)?-\[[^\]]+\]/g,
		/\bspace-(?:x|y)-\[[^\]]+\]/g,
	];

	for (const regex of bracketedSpacing) {
		const matches = text.match(regex);
		if (!matches) continue;
		for (const token of matches) {
			addViolation(filePath, token, "bracketed value not allowed");
		}
	}

	const marginPaddingRegex = /\b([mp][trblxy]?)-(\d+(?:\.\d+)?)\b/g;
	const gapRegex = /\bgap(?:-x|-y)?-(\d+(?:\.\d+)?)\b/g;
	const spaceRegex = /\bspace-(?:x|y)-(\d+(?:\.\d+)?)\b/g;

	let match;
	while ((match = marginPaddingRegex.exec(text)) !== null) {
		const token = match[0];
		const size = match[2];
		if (!allowed.marginPadding.has(size)) {
			addViolation(filePath, token, `size ${size} not allowed`);
		}
	}

	while ((match = gapRegex.exec(text)) !== null) {
		const token = match[0];
		const size = match[1];
		if (!allowed.gap.has(size)) {
			addViolation(filePath, token, `size ${size} not allowed`);
		}
	}

	while ((match = spaceRegex.exec(text)) !== null) {
		const token = match[0];
		const size = match[1];
		if (!allowed.space.has(size)) {
			addViolation(filePath, token, `size ${size} not allowed`);
		}
	}
}

if (!fs.existsSync(srcDir)) {
	console.error("No src directory found; spacing check skipped.");
	process.exit(1);
}

walk(srcDir);

if (fileViolations.size) {
	console.error("Spacing violations detected:");
	for (const [filePath, tokens] of fileViolations.entries()) {
		const rel = path.relative(root, filePath);
		const uniqueTokens = Array.from(new Set(tokens)).sort();
		console.error(`- ${rel}: ${uniqueTokens.join(", ")}`);
	}
	process.exit(1);
}

console.log("Spacing check passed.");
