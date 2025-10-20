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
    <div className="settings-pane">
      <section>
        <h2>Shop Profile</h2>
        <form className="settings-form" onSubmit={handleProfileSubmit}>
          <label>
            <span>Shop Name</span>
            <input value={profile.name} onChange={event => setProfile({...profile, name: event.target.value})} required />
          </label>
          <label>
            <span>Address</span>
            <textarea value={profile.address} onChange={event => setProfile({...profile, address: event.target.value})} />
          </label>
          <label>
            <span>Phone</span>
            <input value={profile.phone} onChange={event => setProfile({...profile, phone: event.target.value})} />
          </label>
          <label>
            <span>Tax ID</span>
            <input value={profile.taxId} onChange={event => setProfile({...profile, taxId: event.target.value})} />
          </label>
          <label>
            <span>Currency Symbol</span>
            <input value={profile.currencySymbol} maxLength={3} onChange={event => setProfile({...profile, currencySymbol: event.target.value})} />
          </label>
          <label>
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
          <label className="settings-wide">
            <span>Invoice Footer</span>
            <textarea value={profile.invoiceFooter} onChange={event => setProfile({...profile, invoiceFooter: event.target.value})} />
          </label>
          <button type="submit">Save Profile</button>
        </form>
      </section>

      <section>
        <h2>Preferences</h2>
        <form className="settings-form" onSubmit={handlePreferencesSubmit}>
          <label>
            <span>Locale</span>
            <input value={preferences.locale} onChange={event => setPreferences({...preferences, locale: event.target.value})}/>
          </label>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={event => setPreferences({...preferences, highContrast: event.target.checked})}
            />
            High contrast mode
          </label>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={preferences.enableTelemetry}
              onChange={event => setPreferences({...preferences, enableTelemetry: event.target.checked})}
            />
            Enable error telemetry logging
          </label>
          <button type="submit">Save Preferences</button>
        </form>
      </section>

      <section>
        <h2>Owner PIN</h2>
        <form className="settings-form" onSubmit={handlePinSet}>
          <label>
            <span>New PIN</span>
            <input type="password" name="pin" minLength={4} maxLength={10} required />
          </label>
          <label>
            <span>Confirm PIN</span>
            <input type="password" name="confirm" minLength={4} maxLength={10} required />
          </label>
          <button type="submit">Set PIN</button>
        </form>

        {pinSet ? (
          <>
            <form className="settings-form" onSubmit={handlePinVerify}>
              <label>
                <span>Verify PIN</span>
                <input type="password" name="verify" minLength={4} maxLength={10} required />
              </label>
              <button type="submit">Verify</button>
            </form>
            <button type="button" className="settings-danger" onClick={handlePinClear}>Clear PIN</button>
          </>
        ) : (
          <p>No owner PIN configured.</p>
        )}
      </section>

      {message && <p className="settings-message" role="status">{message}</p>}
      {error && <p className="settings-error">{error}</p>}
    </div>
  );
}
