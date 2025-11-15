\"use client\";

import * as React from \"react\";

type Theme = \"light\" | \"dark\" | \"system\";
type ResolvedTheme = \"light\" | \"dark\";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

const storageKey = \"ui-theme\";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === \"undefined\") {
    return \"light\";
  }
  return window.matchMedia(\"(prefers-color-scheme: dark)\").matches
    ? \"dark\"
    : \"light\";
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = React.useState<Theme>(\"system\");
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>(\"light\");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    const stored = window.localStorage.getItem(storageKey) as Theme | null;
    const initialTheme = stored ?? \"system\";
    setThemeState(initialTheme);
    const systemTheme = getSystemTheme();
    const nextResolved =
      initialTheme === \"system\" ? systemTheme : (initialTheme as ResolvedTheme);
    setResolvedTheme(nextResolved);
    document.documentElement.classList.toggle(\"dark\", nextResolved === \"dark\");
  }, []);

  React.useEffect(() => {
    if (!isMounted) {
      return;
    }
    const systemTheme = getSystemTheme();
    const nextResolved =
      theme === \"system\" ? systemTheme : (theme as ResolvedTheme);
    setResolvedTheme(nextResolved);
    document.documentElement.classList.toggle(\"dark\", nextResolved === \"dark\");
    if (theme === \"system\") {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, theme);
    }
  }, [theme, isMounted]);

  React.useEffect(() => {
    if (!isMounted) {
      return;
    }
    const media = window.matchMedia(\"(prefers-color-scheme: dark)\");
    const handleChange = () => {
      if (theme !== \"system\") {
        return;
      }
      const systemTheme = media.matches ? \"dark\" : \"light\";
      setResolvedTheme(systemTheme);
      document.documentElement.classList.toggle(
        \"dark\",
        systemTheme === \"dark\"
      );
    };
    media.addEventListener(\"change\", handleChange);
    return () => media.removeEventListener(\"change\", handleChange);
  }, [theme, isMounted]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error(\"useTheme must be used within ThemeProvider\");
  }
  return ctx;
}

