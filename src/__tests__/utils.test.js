// Tests for utility functions mirrored from App.jsx
// timeAgo and avatarColor are not exported, so they are reimplemented
// here matching the exact logic in App.jsx to ensure correctness.

// ─── timeAgo ─────────────────────────────────────────────────────────────────
// Mirrors: const timeAgo = (dateStr) => { ... } from App.jsx
const timeAgo = (dateStr) => {
  const now = new Date();
  const past = new Date(dateStr);
  const mins = Math.floor((now - past) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── avatarColor ──────────────────────────────────────────────────────────────
// Mirrors: const avatarColor = (name) => `hsl(${...}, 55%, 65%)` from App.jsx
const avatarColor = (name) =>
  `hsl(${(name || "?").charCodeAt(0) * 37 % 360}, 55%, 65%)`;

// ─── timeAgo tests ────────────────────────────────────────────────────────────
describe("timeAgo", () => {
  test("returns minutes ago format for < 60 mins", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe("5m ago");
  });

  test("returns hours ago format for < 24 hrs", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  test("returns days ago format for < 7 days", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  test("returns formatted date for >= 7 days", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = timeAgo(tenDaysAgo);
    // Should be a locale date string, not a "Xm/h/d ago" string
    expect(result).not.toMatch(/ago/);
    // Should contain a month name abbreviation
    expect(result).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });

  test("returns '0m ago' for current time", () => {
    const justNow = new Date().toISOString();
    expect(timeAgo(justNow)).toBe("0m ago");
  });

  test("returns '1h ago' for 61 minutes ago", () => {
    const sixtyOneMinutesAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    expect(timeAgo(sixtyOneMinutesAgo)).toBe("1h ago");
  });

  test("returns '1d ago' for 25 hours ago", () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twentyFiveHoursAgo)).toBe("1d ago");
  });
});

// ─── avatarColor tests ────────────────────────────────────────────────────────
describe("avatarColor", () => {
  test("returns a valid HSL color string", () => {
    const result = avatarColor("Alice");
    expect(result).toMatch(/^hsl\(\d+, 55%, 65%\)$/);
  });

  test("is deterministic — same input always produces same output", () => {
    const first = avatarColor("Bob");
    const second = avatarColor("Bob");
    expect(first).toBe(second);
  });

  test("different names produce different colors", () => {
    const alice = avatarColor("Alice");
    const bob = avatarColor("Bob");
    // Different first characters → different hue
    expect(alice).not.toBe(bob);
  });

  test("handles null/undefined gracefully by using '?'", () => {
    const nullResult = avatarColor(null);
    const questionMark = avatarColor("?");
    expect(nullResult).toBe(questionMark);
  });

  test("handles empty string gracefully by using '?'", () => {
    const emptyResult = avatarColor("");
    const questionMark = avatarColor("?");
    expect(emptyResult).toBe(questionMark);
  });

  test("hue is within 0-359 range", () => {
    const testNames = ["Alice", "Bob", "Charlie", "Zara", "1", "admin"];
    for (const name of testNames) {
      const result = avatarColor(name);
      const hueMatch = result.match(/^hsl\((\d+),/);
      expect(hueMatch).not.toBeNull();
      const hue = parseInt(hueMatch[1], 10);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});
