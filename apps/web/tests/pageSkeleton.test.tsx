import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { PageSkeleton } from "~/components/PageSkeleton";

function renderWithMantine(ui: ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

function skeletonCount(container: HTMLElement) {
  return container.querySelectorAll(".mantine-Skeleton-root").length;
}

describe("PageSkeleton", () => {
  it("exposes a labelled status region for assistive tech", () => {
    renderWithMantine(<PageSkeleton />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("renders the header placeholders plus eight content rows by default", () => {
    const { container } = renderWithMantine(<PageSkeleton />);
    // 2 header skeletons (icon + title) + 8 default content rows
    expect(skeletonCount(container)).toBe(10);
  });

  it("renders the requested number of content rows", () => {
    const { container } = renderWithMantine(<PageSkeleton rows={3} />);
    // 2 header skeletons + 3 content rows
    expect(skeletonCount(container)).toBe(5);
  });

  it("renders only the header when asked for zero rows", () => {
    const { container } = renderWithMantine(<PageSkeleton rows={0} />);
    expect(skeletonCount(container)).toBe(2);
  });

  it("accepts a custom container size without throwing", () => {
    const { container } = renderWithMantine(
      <PageSkeleton size="sm" rows={1} />,
    );
    expect(skeletonCount(container)).toBe(3);
  });
});
