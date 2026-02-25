import "@testing-library/jest-dom";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

describe("Next.js smoke tests", () => {
  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ??
      ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
  });

  it("renders an app router page", () => {
    const AppRouterPage = require("../__testfixtures__/testapp/page").default;
    render(<AppRouterPage />);
    expect(
      screen.getByText("This is the app directory! Woohoo!"),
    ).toBeInTheDocument();
  });

  it("renders a not-found app router page", () => {
    const NotFoundPage = require("../app/not-found").default;
    render(
      <MantineProvider>
        <NotFoundPage />
      </MantineProvider>,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
