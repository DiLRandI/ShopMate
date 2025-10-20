import {useEffect, useMemo, useState} from "react";
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
  const [highContrast, setHighContrast] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void initialise();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

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
        case "h":
        case "H":
          event.preventDefault();
          void toggleHighContrast();
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [highContrast]);

  const shopName = useMemo(() => profile?.name ?? "ShopMate", [profile]);

  async function initialise() {
    try {
      const [profileData, preferencesData] = await Promise.all([
        fetchProfile(),
        fetchPreferences(),
      ]);
      setProfile(profileData);
      setPreferences(preferencesData);
      setHighContrast(preferencesData.highContrast);
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

  async function toggleHighContrast() {
    if (!preferences) return;
    const updated = {...preferences, highContrast: !highContrast};
    try {
      const saved = await savePreferences(updated);
      setPreferences(saved);
      setHighContrast(saved.highContrast);
      setStatusMessage(saved.highContrast ? "High contrast enabled." : "High contrast disabled.");
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
    setHighContrast(updated.highContrast);
  }

  let content: JSX.Element | null = null;
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
    <>
      <AppShell
        navItems={NAV_ITEMS}
        activePage={activePage}
        onNavigate={setActivePage}
        lowStockCount={lowStockCount}
        isHighContrast={highContrast}
        onToggleHighContrast={() => void toggleHighContrast()}
        statusMessage={statusMessage}
        shopName={shopName}
      >
        {content}
      </AppShell>

      {showOnboarding && profile && (
        <OnboardingDialog initialProfile={profile} onComplete={handleOnboardingComplete}/>
      )}
    </>
  );
}
