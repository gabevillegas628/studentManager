import { useState, useEffect } from "react";
import api from "../../api/client";
import type { DigestPreferences } from "../../types";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

function formatTimezone(tz: string): string {
  try {
    const now = new Date();
    const short = now.toLocaleString("en-US", { timeZone: tz, timeZoneName: "short" }).split(" ").pop();
    return `${tz.replace(/_/g, " ")} (${short})`;
  } catch {
    return tz;
  }
}

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export default function Settings() {
  const [prefs, setPrefs] = useState<DigestPreferences>({
    digestEnabled: false,
    digestHour: 8,
    digestTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/settings/digest").then((res) => {
      setPrefs(res.data);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await api.patch("/settings/digest", prefs);
      setPrefs(res.data);
      setMessage("Preferences saved!");
    } catch {
      setMessage("Failed to save preferences.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Configure your notification preferences.
      </p>

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900">
            Daily Digest Email
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Receive a daily summary of new requests, comments, and items needing
            your attention.
          </p>

          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.digestEnabled}
                onChange={(e) =>
                  setPrefs({ ...prefs, digestEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
              <span className="text-sm text-gray-700">
                Enable daily digest emails
              </span>
            </label>

            {prefs.digestEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery time
                  </label>
                  <select
                    value={prefs.digestHour}
                    onChange={(e) =>
                      setPrefs({ ...prefs, digestHour: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {formatHour(i)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Timezone
                  </label>
                  <select
                    value={prefs.digestTimezone}
                    onChange={(e) =>
                      setPrefs({ ...prefs, digestTimezone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {formatTimezone(tz)}
                      </option>
                    ))}
                    {!COMMON_TIMEZONES.includes(prefs.digestTimezone) && (
                      <option value={prefs.digestTimezone}>
                        {formatTimezone(prefs.digestTimezone)}
                      </option>
                    )}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          {message && (
            <span
              className={`text-sm ${
                message.includes("Failed") ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
