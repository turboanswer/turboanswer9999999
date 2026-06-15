import { IS_NATIVE } from "@/lib/api-base";

export { IS_NATIVE };
export * from "./types";
export * from "./contacts";
export * from "./calendar";
export * from "./notifications";
export * from "./reminders";
export * from "./intent";

/** True when on-device native features (contacts/calendar/notifications) are usable. */
export function isNativeFeaturesAvailable(): boolean {
  return IS_NATIVE;
}
