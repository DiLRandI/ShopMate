import {
  ClearOwnerPIN,
  HasOwnerPIN,
  Preferences,
  Profile,
  SavePreferences,
  SaveProfile,
  SetOwnerPIN,
  VerifyOwnerPIN,
} from "../../../wailsjs/go/settings/API";
import {settings} from "../../../wailsjs/go/models";
import {unwrap, unwrapVoid} from "@/services/wailsResponse";

export type ShopProfile = settings.Profile;
export type PreferencesPayload = settings.Preferences;

export async function fetchProfile(): Promise<ShopProfile> {
  const envelope = await Profile();
  return settings.Profile.createFrom(unwrap(envelope));
}

export async function saveProfile(profile: ShopProfile): Promise<ShopProfile> {
  const envelope = await SaveProfile(settings.Profile.createFrom(profile));
  return settings.Profile.createFrom(unwrap(envelope));
}

export async function fetchPreferences(): Promise<PreferencesPayload> {
  const envelope = await Preferences();
  return settings.Preferences.createFrom(unwrap(envelope));
}

export async function savePreferences(prefs: PreferencesPayload): Promise<PreferencesPayload> {
  const envelope = await SavePreferences(settings.Preferences.createFrom(prefs));
  return settings.Preferences.createFrom(unwrap(envelope));
}

export async function setOwnerPin(pin: string): Promise<void> {
  const envelope = await SetOwnerPIN(pin);
  unwrapVoid(envelope);
}

export async function verifyOwnerPin(pin: string): Promise<void> {
  const envelope = await VerifyOwnerPIN(pin);
  unwrapVoid(envelope);
}

export async function clearOwnerPin(): Promise<void> {
  const envelope = await ClearOwnerPIN();
  unwrapVoid(envelope);
}

export async function hasOwnerPin(): Promise<boolean> {
  const envelope = await HasOwnerPIN();
  return unwrap(envelope);
}
