import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// RouterTransition drives Mantine's NavigationProgress bar off pathname
// changes: it completes the progress bar on mount/path change and starts it on
// cleanup. We mock next/navigation's usePathname and @mantine/nprogress so we
// can assert the lifecycle calls and that the bar renders.
// ---------------------------------------------------------------------------

const mockUsePathname = jest.fn<() => string>();
const mockComplete = jest.fn();
const mockStart = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock("@mantine/nprogress", () => ({
  __esModule: true,
  NavigationProgress: ({
    size,
    "aria-label": label,
  }: {
    size?: number;
    "aria-label"?: string;
  }) => (
    <div data-testid="nav-progress" aria-label={label}>
      {`progress-${size}`}
    </div>
  ),
  nprogress: {
    complete: () => mockComplete(),
    start: () => mockStart(),
  },
}));

function renderTransition() {
  const { RouterTransition } = require("~/components/RouterTransition");
  return render(<RouterTransition />);
}

describe("RouterTransition", () => {
  beforeEach(() => {
    mockUsePathname.mockReset().mockReturnValue("/home");
    mockComplete.mockReset();
    mockStart.mockReset();
  });

  it("renders the NavigationProgress bar and completes progress on mount", () => {
    renderTransition();
    expect(screen.getByTestId("nav-progress")).toHaveTextContent("progress-5");
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("names the bar for assistive technology", () => {
    renderTransition();
    expect(screen.getByTestId("nav-progress")).toHaveAttribute(
      "aria-label",
      "Page loading",
    );
  });

  it("starts progress on unmount (effect cleanup)", () => {
    const { unmount } = renderTransition();
    expect(mockComplete).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockStart).toHaveBeenCalledTimes(1);
  });
});
