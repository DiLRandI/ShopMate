import {useState} from "react";
import type {FormEvent} from "react";
import type {ShopProfile} from "@/features/settings/api";

type OnboardingDialogProps = {
  initialProfile: ShopProfile;
  onComplete: (profile: ShopProfile, importFile: File | null) => Promise<void> | void;
};

export function OnboardingDialog({initialProfile, onComplete}: OnboardingDialogProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile.name.trim()) {
      setError("Shop name is required");
      return;
    }
    try {
      await onComplete(profile, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <form className="onboarding-card" onSubmit={handleSubmit}>
        <h2>Welcome to ShopMate</h2>
        <p>Let’s set up the basics so you can start selling.</p>
        <label>
          <span>Shop Name</span>
          <input value={profile.name} onChange={event => setProfile({...profile, name: event.target.value})} required />
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
        <label className="onboarding-upload">
          <span>Import Initial Products (CSV)</span>
          <input type="file" accept=".csv" onChange={event => setFile(event.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="onboarding-error">{error}</p>}
        <button type="submit">Start Using POS</button>
      </form>
    </div>
  );
}
