import {useEffect, useMemo, useState} from "react";
import type {ReactNode} from "react";
import {AppShell} from "./AppShell";
import {DashboardPage} from "@/pages/Dashboard";
import {PosPage} from "@/features/pos/PosPage";
import {SalesPage} from "@/pages/Sales";
import {ReportsPage} from "@/pages/Reports";
import {SettingsPage} from "@/pages/Settings";
import {OnboardingDialog} from "@/features/onboarding/OnboardingDialog";
import {fetchLowStockCount, importProductsFromCSV} from "@/features/products/api";
import {
  fetchPreferences,
  fetchProfile,
  savePreferences,
  saveProfile,
  type PreferencesPayload,
  type ShopProfile,
} from "@/features/settings/api";
import {ShopProfileProvider} from "@/features/settings/ShopProfileContext";
export type PageKey = "dashboard" | "pos" | "sales" | "reports" | "settings";

type NavItem = {
  key: PageKey;
  label: string;
  shortcut: string;
};

const NAV_ITEMS: NavItem[] = [
  {key: "dashboard", label: "Products", shortcut: "Alt+1"},
  {key: "pos", label: "POS", shortcut: "Alt+2"},
  {key: "sales", label: "Sales", shortcut: "Alt+3"},
  {key: "reports", label: "Reports", shortcut: "Alt+4"},
  {key: "settings", label: "Settings", shortcut: "Alt+5"},
];

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [lowStockCount, setLowStockCount] = useState(0);
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [preferences, setPreferences] = useState<PreferencesPayload | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void initialise();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.body.classList.toggle("theme-dark", darkMode);
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("theme-dark");
    };
  }, [darkMode]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!event.altKey) return;
      switch (event.key) {
        case "1":
          event.preventDefault();
          setActivePage("dashboard");
          break;
        case "2":
          event.preventDefault();
          setActivePage("pos");
          break;
        case "3":
          event.preventDefault();
          setActivePage("sales");
          break;
        case "4":
          event.preventDefault();
          setActivePage("reports");
          break;
        case "5":
          event.preventDefault();
          setActivePage("settings");
          break;
        case "d":
        case "D":
          event.preventDefault();
          void toggleDarkMode();
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [darkMode]);

  const shopName = useMemo(() => profile?.name ?? "ShopMate", [profile]);

  async function initialise() {
    try {
      const [profileData, preferencesData] = await Promise.all([
        fetchProfile(),
        fetchPreferences(),
      ]);
      setProfile(profileData);
      setPreferences(preferencesData);
      setDarkMode(preferencesData.darkMode);
      if (!profileData.name.trim()) {
        setShowOnboarding(true);
      }
      const low = await fetchLowStockCount();
      setLowStockCount(low);
    } catch (error) {
      setStatusMessage(`Initialisation failed: ${describeError(error)}`);
    }
  }

  async function refreshLowStock() {
    try {
      const low = await fetchLowStockCount();
      setLowStockCount(low);
    } catch (error) {
      setStatusMessage(`Unable to refresh stock status: ${describeError(error)}`);
    }
  }

  async function toggleDarkMode() {
    if (!preferences) return;
    const updated = {...preferences, darkMode: !darkMode};
    try {
      const saved = await savePreferences(updated);
      setPreferences(saved);
      setDarkMode(saved.darkMode);
      setStatusMessage(saved.darkMode ? "Dark theme enabled." : "Dark theme disabled.");
    } catch (error) {
      setStatusMessage(`Unable to update preferences: ${describeError(error)}`);
    }
  }

  async function handleOnboardingComplete(updatedProfile: ShopProfile, importFile: File | null) {
    try {
      const saved = await saveProfile(updatedProfile);
      setProfile(saved);
      if (importFile) {
        const csv = await importFile.text();
        await importProductsFromCSV(csv);
        await refreshLowStock();
      }
      setShowOnboarding(false);
      setStatusMessage("Setup complete. You're ready to sell!");
    } catch (error) {
      setStatusMessage(`Onboarding failed: ${describeError(error)}`);
    }
  }

  function handleProfileChange(updated: ShopProfile) {
    setProfile(updated);
  }

  function handlePreferencesChange(updated: PreferencesPayload) {
    setPreferences(updated);
    setDarkMode(updated.darkMode);
  }

  let content: ReactNode = null;
  switch (activePage) {
    case "dashboard":
      content = <DashboardPage onInventoryChanged={low => setLowStockCount(low)}/>; // low value from callback
      break;
    case "pos":
      content = <PosPage onInventoryChanged={refreshLowStock}/>;
      break;
    case "sales":
      content = <SalesPage/>;
      break;
    case "reports":
      content = <ReportsPage/>;
      break;
    case "settings":
      content = (
        <SettingsPage
          initialProfile={profile}
          initialPreferences={preferences}
          onProfileChange={handleProfileChange}
          onPreferencesChange={handlePreferencesChange}
        />
      );
      break;
    default:
      content = null;
  }

  return (
    <ShopProfileProvider profile={profile}>
      <AppShell
        navItems={NAV_ITEMS}
        activePage={activePage}
        onNavigate={setActivePage}
        lowStockCount={lowStockCount}
        isDarkMode={darkMode}
        onToggleDarkMode={() => void toggleDarkMode()}
        statusMessage={statusMessage}
        shopName={shopName}
      >
        {content}
      </AppShell>

      {showOnboarding && profile && (
        <OnboardingDialog initialProfile={profile} onComplete={handleOnboardingComplete}/>
      )}
    </ShopProfileProvider>
  );
}
