"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type ThemePackage = {
  key: string;
  label: string;
  bg: string;
  button: string;
  text: string;
};

type ButtonPref = {
  label: string;
  icon: string;
};

type ButtonPrefs = {
  [key: string]: ButtonPref;
};

type ProductImages = {
  [productId: string]: string;
};

type UserProfile = {
  name: string;
  role: string;
  logo: string;
};

type PreferencesContextValue = {
  isCustomize: boolean;
  buttonPrefs: ButtonPrefs;
  themePackages: ThemePackage[];
  activeThemeKey: string;
  productImages: ProductImages;
  userProfile: UserProfile;
  customTheme: ThemePackage;

  toggleCustomize: () => void;
  setButtonPref: (key: string, pref: Partial<ButtonPref>) => void;
  getButtonLabel: (key: string, defaultLabel: string) => string;
  setProductImage: (productId: string, imageUrl: string) => void;
  getProductImage: (productId: string, defaultImage: string) => string;
  setUserProfile: (profile: UserProfile) => void;
  setActiveThemeKey: (key: string) => void;
  setCustomTheme: (theme: ThemePackage) => void;
  
  getButtonClasses: () => { bg: string; text: string };
  getBackgroundClass: () => string;
  getTextClass: () => string;
  getUserProfile: () => UserProfile;

  resetCustomization: () => void;
};

const themePackages: ThemePackage[] = [
  {
    key: "dark",
    label: "Dark",
    bg: "bg-[#0a0a0a]",
    button: "bg-[#fafafa] text-[#0a0a0a]",
    text: "text-[#fafafa]",
  },
  {
    key: "light",
    label: "Light",
    bg: "bg-[#ffffff]",
    button: "bg-[#18181b] text-[#fafafa]",
    text: "text-[#18181b]",
  },
  {
    key: "green",
    label: "Emerald Green",
    bg: "bg-[#064e3b]",
    button: "bg-[#ffffff] text-[#065f46]",
    text: "text-[#ffffff]",
  },
  {
    key: "blue",
    label: "Ocean Blue",
    bg: "bg-[#1e3a8a]",
    button: "bg-[#ffffff] text-[#1e3a8a] hover:bg-white/90",
    text: "text-[#ffffff]",
  },
  {
    key: "purple",
    label: "Royal Purple",
    bg: "bg-[#581c87]",
    button: "bg-[#ffffff] text-[#581c87] hover:bg-white/90",
    text: "text-[#ffffff]",
  },
];

const defaultUserProfile: UserProfile = {
  name: "Ngumpul Pas Deadline",
  role: "Kasir & Barista",
  logo: "/Logo.png",
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const getInitialState = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (error) {
    console.error("Error reading localStorage key:", key, error);
    return defaultValue;
  }
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [isCustomize, setIsCustomize] = useState(() =>
    getInitialState("isCustomize", false)
  );
  const [activeThemeKeyState, setActiveThemeKeyState] = useState(() =>
    getInitialState("activeThemeKey", themePackages[0].key)
  );
  const [buttonPrefs, setButtonPrefs] = useState<ButtonPrefs>(() =>
    getInitialState("buttonPrefs", {})
  );
  const [productImages, setProductImages] = useState<ProductImages>(() =>
    getInitialState("productImages", {})
  );
  const [userProfile, setUserProfileState] = useState<UserProfile>(() =>
    getInitialState("userProfile", defaultUserProfile)
  );
  
  const initialTheme = themePackages.find(t => t.key === activeThemeKeyState) || themePackages[0];
  const [customTheme, setCustomThemeState] = useState<ThemePackage>(() =>
    getInitialState("customTheme", initialTheme)
  );

  useEffect(() => {
    localStorage.setItem("isCustomize", JSON.stringify(isCustomize));
  }, [isCustomize]);

  useEffect(() => {
    localStorage.setItem("activeThemeKey", JSON.stringify(activeThemeKeyState));
  }, [activeThemeKeyState]);

  useEffect(() => {
    localStorage.setItem("buttonPrefs", JSON.stringify(buttonPrefs));
  }, [buttonPrefs]);

  useEffect(() => {
    localStorage.setItem("productImages", JSON.stringify(productImages));
  }, [productImages]);

  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
  }, [userProfile]);
  
  useEffect(() => {
    localStorage.setItem("customTheme", JSON.stringify(customTheme));
  }, [customTheme]);

  const toggleCustomize = () => setIsCustomize((s) => !s);
  
  const resetCustomization = () => {
    setIsCustomize(false);
  };

  const setCustomTheme = (theme: ThemePackage) => {
    setCustomThemeState(theme);
    setIsCustomize(true);
  };

  const setActiveThemeKey = (key: string) => {
    setActiveThemeKeyState(key);
    resetCustomization();
  };

  const getActiveTheme = (): ThemePackage => {
    if (isCustomize) return customTheme; 

    const active = themePackages.find((t) => t.key === activeThemeKeyState);
    
    return active || themePackages[0];
  };

  const activeTheme = getActiveTheme();

  const getButtonClasses = () => {
    const [bg, text] = activeTheme.button.split(" ");
    return { bg, text };
  };

  const getBackgroundClass = () => activeTheme.bg;
  const getTextClass = () => activeTheme.text;

  const setButtonPref = (key: string, pref: Partial<ButtonPref>) => {
    setButtonPrefs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...pref,
      },
    }));
  };

  const getButtonLabel = (key: string, defaultLabel: string): string => {
    return buttonPrefs[key]?.label || defaultLabel;
  };
  
  const setProductImage = (productId: string, imageUrl: string) => {
    setProductImages((prev) => ({
      ...prev,
      [productId]: imageUrl,
    }));
  };

  const getProductImage = (productId: string, defaultImage: string): string => {
    return productImages[productId] || defaultImage;
  };

  const getUserProfile = (): UserProfile => userProfile;
  const setUserProfile = (profile: UserProfile) => setUserProfileState(profile);

  const value: PreferencesContextValue = {
    isCustomize,
    buttonPrefs,
    themePackages,
    activeThemeKey: activeThemeKeyState,
    productImages,
    userProfile,
    customTheme,
    
    toggleCustomize,
    setButtonPref,
    getButtonLabel,
    setProductImage,
    getProductImage,
    setUserProfile,
    setActiveThemeKey,
    setCustomTheme,
    
    getButtonClasses,
    getBackgroundClass,
    getTextClass,
    getUserProfile,

    resetCustomization,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};