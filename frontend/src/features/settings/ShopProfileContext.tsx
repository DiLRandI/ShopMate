import {createContext, useContext, useMemo} from "react";
import type {ReactNode} from "react";
import type {ShopProfile} from "./api";

type ShopProfileContextValue = {
  profile: ShopProfile | null;
  currencySymbol: string;
  formatCurrency: (cents: number) => string;
};

function normaliseSymbol(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return "$";
  }
  return trimmed;
}

export function formatCurrencyWithSymbol(symbol: string, cents: number): string {
  const normalised = normaliseSymbol(symbol);
  const amount = cents / 100;
  const formatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${normalised}${formatted}` : `${normalised}${formatted}`;
}

const defaultValue: ShopProfileContextValue = {
  profile: null,
  currencySymbol: "$",
  formatCurrency: cents => formatCurrencyWithSymbol("$", cents),
};

const ShopProfileContext = createContext<ShopProfileContextValue>(defaultValue);

type ProviderProps = {
  profile: ShopProfile | null;
  children: ReactNode;
};

export function ShopProfileProvider({profile, children}: ProviderProps) {
  const value = useMemo<ShopProfileContextValue>(() => {
    const currencySymbol = normaliseSymbol(profile?.currencySymbol);
    return {
      profile,
      currencySymbol,
      formatCurrency: cents => formatCurrencyWithSymbol(currencySymbol, cents),
    };
  }, [profile]);

  return (
    <ShopProfileContext.Provider value={value}>
      {children}
    </ShopProfileContext.Provider>
  );
}

export function useShopProfile(): ShopProfileContextValue {
  return useContext(ShopProfileContext);
}

export function useCurrencyFormatter(): {
  currencySymbol: string;
  formatCurrency: (cents: number) => string;
} {
  const {currencySymbol, formatCurrency} = useShopProfile();
  return {currencySymbol, formatCurrency};
}
