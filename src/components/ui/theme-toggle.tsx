import dynamic from "next/dynamic";

const ThemeToggle = dynamic(
	() =>
		import("./theme-toggle-client").then((mod) => ({
			default: mod.ThemeToggle,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background/70" />
		),
	},
);

export { ThemeToggle };
