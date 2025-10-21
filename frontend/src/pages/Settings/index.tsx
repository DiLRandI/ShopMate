import {useEffect, useState} from "react";
import type {FormEvent} from "react";
import {
  clearOwnerPin,
  fetchPreferences,
  fetchProfile,
  hasOwnerPin,
  savePreferences,
  saveProfile,
  setOwnerPin,
  verifyOwnerPin,
  type PreferencesPayload,
  type ShopProfile,
} from "@/features/settings/api";

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

type SettingsPageProps = {
  initialProfile?: ShopProfile | null;
  initialPreferences?: PreferencesPayload | null;
  onProfileChange?: (profile: ShopProfile) => void;
  onPreferencesChange?: (prefs: PreferencesPayload) => void;
};

export function SettingsPage({initialProfile = null, initialPreferences = null, onProfileChange, onPreferencesChange}: SettingsPageProps) {
  const [profile, setProfile] = useState<ShopProfile | null>(initialProfile);
  const [preferences, setPreferences] = useState<PreferencesPayload | null>(initialPreferences);
  const [pinSet, setPinSet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialProfile || !initialPreferences) {
      void initialise();
    }
  }, [initialProfile, initialPreferences]);

  useEffect(() => {
    if (profile) {
      onProfileChange?.(profile);
    }
  }, [profile, onProfileChange]);

  useEffect(() => {
    if (preferences) {
      onPreferencesChange?.(preferences);
    }
  }, [preferences, onPreferencesChange]);

  async function initialise() {
    try {
      const [profileData, prefsData, pinStatus] = await Promise.all([
        fetchProfile(),
        fetchPreferences(),
        hasOwnerPin(),
      ]);
      setProfile(profileData);
      setPreferences(prefsData);
      setPinSet(pinStatus);
    } catch (err) {
      setError(`Failed to load settings: ${describeError(err)}`);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    try {
      const saved = await saveProfile(profile);
      setProfile(saved);
      onProfileChange?.(saved);
      setMessage("Profile updated.");
      setError(null);
    } catch (err) {
      setError(`Unable to save profile: ${describeError(err)}`);
    }
  }

  async function handlePreferencesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preferences) return;
    try {
      const saved = await savePreferences(preferences);
      setPreferences(saved);
      onPreferencesChange?.(saved);
      setMessage("Preferences saved.");
      setError(null);
    } catch (err) {
      setError(`Unable to save preferences: ${describeError(err)}`);
    }
  }

  async function handlePinSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const pin = String(form.get("pin") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (pin !== confirm) {
      setError("PIN confirmation does not match.");
      return;
    }
    try {
      await setOwnerPin(pin);
      setPinSet(true);
      setMessage("Owner PIN updated.");
      setError(null);
      (event.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      setError(`Unable to set owner PIN: ${describeError(err)}`);
    }
  }

  async function handlePinVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const pin = String(form.get("verify") ?? "");
    try {
      await verifyOwnerPin(pin);
      setMessage("PIN verified.");
      setError(null);
      (event.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      setError(`Verification failed: ${describeError(err)}`);
    }
  }

  async function handlePinClear() {
    try {
      await clearOwnerPin();
      setPinSet(false);
      setMessage("Owner PIN cleared.");
      setError(null);
    } catch (err) {
      setError(`Unable to clear PIN: ${describeError(err)}`);
    }
  }

  if (!profile || !preferences) {
    return <p>Loading settings…</p>;
  }

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-2">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Shop Profile</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Update branding and invoice defaults for your storefront.</p>
        </div>
        <form className="grid gap-4" onSubmit={handleProfileSubmit}>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Shop Name</span>
            <input value={profile.name} onChange={event => setProfile({...profile, name: event.target.value})} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Address</span>
            <textarea value={profile.address} onChange={event => setProfile({...profile, address: event.target.value})} rows={2}/>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Phone</span>
              <input value={profile.phone} onChange={event => setProfile({...profile, phone: event.target.value})}/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Tax ID</span>
              <input value={profile.taxId} onChange={event => setProfile({...profile, taxId: event.target.value})}/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Currency Symbol</span>
              <input value={profile.currencySymbol} maxLength={3} onChange={event => setProfile({...profile, currencySymbol: event.target.value})}/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Default Tax Rate (%)</span>
              <input
                type="number"
                step="0.01"
                value={(profile.defaultTaxRateBasisPoints / 100).toString()}
                onChange={event => {
                  const percent = Number.parseFloat(event.target.value);
                  const basisPoints = Number.isNaN(percent) ? 0 : Math.max(0, Math.round(percent * 100));
                  setProfile({...profile, defaultTaxRateBasisPoints: basisPoints});
                }}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Invoice Footer</span>
            <textarea value={profile.invoiceFooter} onChange={event => setProfile({...profile, invoiceFooter: event.target.value})} rows={3}/>
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-gradient-to-r from-brand-primary to-brand-accent px-5 py-2 text-sm font-semibold text-white shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
          >
            Save Profile
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Preferences</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Personalize the desktop experience and telemetry options.</p>
        </div>
        <form className="grid gap-4" onSubmit={handlePreferencesSubmit}>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Locale</span>
            <input value={preferences.locale} onChange={event => setPreferences({...preferences, locale: event.target.value})}/>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={preferences.darkMode}
              onChange={event => setPreferences({...preferences, darkMode: event.target.checked})}
            />
            Dark theme
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={preferences.enableTelemetry}
              onChange={event => setPreferences({...preferences, enableTelemetry: event.target.checked})}
            />
            Enable error telemetry logging
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-gradient-to-r from-brand-primary to-brand-accent px-5 py-2 text-sm font-semibold text-white shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
          >
            Save Preferences
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Current theme</p>
          <p>{preferences.darkMode ? "Dark" : "Light"} mode</p>
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Owner PIN</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Protect refunds, voids, and backup restores with a secure PIN.</p>
        </div>
        <form className="grid gap-4" onSubmit={handlePinSet}>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>New PIN</span>
            <input type="password" name="pin" minLength={4} maxLength={10} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span>Confirm PIN</span>
            <input type="password" name="confirm" minLength={4} maxLength={10} required />
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-gradient-to-r from-brand-primary to-brand-accent px-5 py-2 text-sm font-semibold text-white shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
          >
            Set PIN
          </button>
        </form>

        {pinSet ? (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-700 dark:bg-emerald-900/40">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">PIN configured.</p>
            <form className="grid gap-3" onSubmit={handlePinVerify}>
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span>Verify PIN</span>
                <input type="password" name="verify" minLength={4} maxLength={10} required />
              </label>
              <button
                type="submit"
                className="self-start rounded-full border border-emerald-300 bg-white px-5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 dark:border-emerald-600 dark:bg-slate-900 dark:text-emerald-200"
              >
                Verify PIN
              </button>
            </form>
            <button
              type="button"
              className="rounded-full border border-rose-300 px-5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400/50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-200"
              onClick={handlePinClear}
            >
              Clear PIN
            </button>
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">No owner PIN configured.</p>
        )}
      </section>

      <div className="xl:col-span-2">
        {message && (
          <p className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
