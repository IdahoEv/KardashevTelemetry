import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";

import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
});

afterEach(() => root.removeAttribute("data-theme"));

function renderToggle() {
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

test("follows the OS setting by default, leaving data-theme unset", () => {
  renderToggle();

  expect(root.hasAttribute("data-theme")).toBe(false);
  expect((screen.getByLabelText("System") as HTMLInputElement).checked).toBe(true);
});

test("choosing dark or light stamps data-theme on the root element", () => {
  renderToggle();

  fireEvent.click(screen.getByLabelText("Dark"));
  expect(root.getAttribute("data-theme")).toBe("dark");

  fireEvent.click(screen.getByLabelText("Light"));
  expect(root.getAttribute("data-theme")).toBe("light");
});

test("choosing system clears the override", () => {
  renderToggle();

  fireEvent.click(screen.getByLabelText("Dark"));
  fireEvent.click(screen.getByLabelText("System"));

  expect(root.hasAttribute("data-theme")).toBe(false);
});

test("restores the saved choice on mount", () => {
  localStorage.setItem("kardashev-theme", "dark");

  renderToggle();

  expect(root.getAttribute("data-theme")).toBe("dark");
  expect((screen.getByLabelText("Dark") as HTMLInputElement).checked).toBe(true);
});

test("ignores an unrecognised saved value", () => {
  localStorage.setItem("kardashev-theme", "sepia");

  renderToggle();

  expect(root.hasAttribute("data-theme")).toBe(false);
});
