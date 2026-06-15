import { fail, WEB_FALLBACK_MESSAGE, nativePluginAvailable, PLUGIN, type NativeResult } from "./types";

export type SimpleContact = {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
};

/**
 * Reads the phone's contacts via the native plugin (after a permission prompt).
 * On web this is intentionally unavailable — callers should point users to the
 * cloud connectors instead.
 */
export async function getDeviceContacts(): Promise<NativeResult<SimpleContact[]>> {
  if (!nativePluginAvailable(PLUGIN.contacts)) return fail("unavailable", WEB_FALLBACK_MESSAGE);
  try {
    const { Contacts } = await import("@capacitor-community/contacts");
    const perm = await Contacts.requestPermissions();
    if (perm.contacts !== "granted" && perm.contacts !== "limited") {
      return fail("denied", "Permission to read your contacts was not granted.");
    }
    const res = await Contacts.getContacts({
      projection: { name: true, phones: true, emails: true },
    });
    const contacts: SimpleContact[] = (res.contacts || [])
      .map((c) => ({
        id: c.contactId,
        name:
          c.name?.display ||
          [c.name?.given, c.name?.family].filter(Boolean).join(" ").trim() ||
          "(no name)",
        phones: (c.phones || []).map((p) => p.number || "").filter(Boolean),
        emails: (c.emails || []).map((e) => e.address || "").filter(Boolean),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, data: contacts };
  } catch (e: any) {
    return fail("error", e?.message || "Could not read contacts.");
  }
}

/** Returns a compact text block of contacts for injecting into an AI prompt. */
export function contactsToContext(contacts: SimpleContact[], limit = 200): string {
  const lines = contacts.slice(0, limit).map((c) => {
    const parts = [c.name];
    if (c.phones.length) parts.push(`☎ ${c.phones.join(", ")}`);
    if (c.emails.length) parts.push(`✉ ${c.emails.join(", ")}`);
    return "- " + parts.join(" | ");
  });
  const more = contacts.length > limit ? `\n…and ${contacts.length - limit} more.` : "";
  return `Phone contacts (${contacts.length} total):\n${lines.join("\n")}${more}`;
}
