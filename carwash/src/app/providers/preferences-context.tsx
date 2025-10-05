'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

type ColorOption = {
  key: string;
  classes: {
    bg: string;
    text: string;
    border?: string;
  };
};

const colorOptions: ColorOption[] = [
  {
    key: 'primary',
    classes: { bg: 'bg-primary', text: 'text-primary-foreground' },
  },
  {
    key: 'secondary',
    classes: { bg: 'bg-secondary', text: 'text-secondary-foreground' },
  },

  {
    key: 'destructive',
    classes: { bg: 'bg-destructive', text: 'text-destructive-foreground' },
  },
  { key: 'blue', classes: { bg: 'bg-blue-500', text: 'text-white' } },
  { key: 'green', classes: { bg: 'bg-green-500', text: 'text-white' } },
  { key: 'yellow', classes: { bg: 'bg-yellow-500', text: 'text-black' } },
  { key: 'red', classes: { bg: 'bg-red-500', text: 'text-white' } },
  { key: 'purple', classes: { bg: 'bg-purple-500', text: 'text-white' } },
  { key: 'gray-dark', classes: { bg: 'bg-gray-700', text: 'text-white' } },
];

type ButtonPref = {
  label?: string;
  color?: string;
};

type UserProfile = {
  name: string;
  role: string;
  photo: string;
};

type PreferencesContextValue = {
  isCustomize: boolean;
  toggleCustomize: () => void;
  buttonPrefs: Record<string, ButtonPref>;
  setButtonPref: (key: string, pref: Partial<ButtonPref>) => void;
  getButtonLabel: (key: string, defaultLabel: string) => string;
  getButtonColorClasses: (key: string) => ColorOption['classes'];
  colorOptions: ColorOption[];
  productImages: Record<string, string>;
  setProductImage: (productId: string, imageUrl: string) => void;
  getProductImage: (productId: string, defaultImage: string) => string;
  getUserProfile: () => UserProfile;
  setUserProfile: (profile: UserProfile) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const STORAGE_KEY = 'carwash-preferences';
const DEFAULT_USER: UserProfile = {
  name: 'WaziTUYA',
  role: 'Admin',
  photo: '/logo.jpg',
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [isCustomize, setIsCustomize] = useState(false);
  const [buttonPrefs, setButtonPrefs] = useState<Record<string, ButtonPref>>(
    {}
  );
  const [productImages, setProductImages] = useState<Record<string, string>>(
    {}
  );
  const [userProfile, setUserProfileState] =
    useState<UserProfile>(DEFAULT_USER);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setButtonPrefs(parsed.buttonPrefs || {});
        setProductImages(parsed.productImages || {});
        setUserProfileState(parsed.userProfile || DEFAULT_USER);
      }
    } catch (e) {
      console.error('Failed to load preferences', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          buttonPrefs,
          productImages,
          userProfile,
        })
      );
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  }, [buttonPrefs, productImages, userProfile]);

  const toggleCustomize = () => setIsCustomize((s) => !s);

  const setButtonPref = (key: string, pref: Partial<ButtonPref>) => {
    setButtonPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...pref },
    }));
  };

  const getButtonLabel = (key: string, defaultLabel: string): string => {
    return buttonPrefs[key]?.label || defaultLabel;
  };

  const getButtonColorClasses = (key: string): ColorOption['classes'] => {
    const colorKey = buttonPrefs[key]?.color || 'primary';
    const found = colorOptions.find((opt) => opt.key === colorKey);
    return found?.classes || colorOptions[0].classes;
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

  const getUserProfile = (): UserProfile => {
    return userProfile;
  };

  const setUserProfile = (profile: UserProfile) => {
    setUserProfileState(profile);
  };

  const value: PreferencesContextValue = {
    isCustomize,
    toggleCustomize,
    buttonPrefs,
    setButtonPref,
    getButtonLabel,
    getButtonColorClasses,
    colorOptions,
    productImages,
    setProductImage,
    getProductImage,
    getUserProfile,
    setUserProfile,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
