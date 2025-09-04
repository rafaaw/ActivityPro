import { useTheme as useNextThemes } from "next-themes";

export const useTheme = () => {
    const { theme, setTheme: setNextTheme, systemTheme } = useNextThemes();

    const currentTheme = theme === "system" ? systemTheme : theme;

    const toggleTheme = () => {
        setNextTheme(currentTheme === "dark" ? "light" : "dark");
    };

    const setTheme = (newTheme: "light" | "dark") => {
        setNextTheme(newTheme);
    };

    return {
        theme,
        currentTheme,
        setTheme,
        toggleTheme,
        isDark: currentTheme === "dark",
        isLight: currentTheme === "light",
    };
};
