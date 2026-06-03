import { createContext, useContext } from "react";

const ThemeContext = createContext(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

/** Single light theme — dark mode removed per product requirements. */
export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider
      value={{
        theme: "light",
        isDark: false,
        toggleTheme: () => {},
        setTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
