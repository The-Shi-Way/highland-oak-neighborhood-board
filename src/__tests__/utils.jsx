import { render } from "@testing-library/react";

// Minimal stub for USE_API = false (no VITE_API_URL set)
// Components depend on import.meta.env which vitest handles

export function renderWithProviders(ui, options = {}) {
  return render(ui, { ...options });
}
