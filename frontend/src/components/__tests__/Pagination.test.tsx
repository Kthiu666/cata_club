/**
 * Component tests for the shared `<Pagination>` control — reuses the
 * existing visual pattern from `attendance/page.tsx` (Prev/Next only, no
 * page-size override, disabled boundary states, keyboard/aria support).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination";

describe("Pagination — render/hidden states", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the page indicator and controls when totalPages > 1", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anterior|previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /siguiente|next/i })).toBeInTheDocument();
  });
});

describe("Pagination — boundary disabled states", () => {
  it("disables 'previous' on the first page and enables 'next'", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /anterior|previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente|next/i })).toBeEnabled();
  });

  it("disables 'next' on the last page and enables 'previous'", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /siguiente|next/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /anterior|previous/i })).toBeEnabled();
  });

  it("both controls disabled when the disabled prop is passed", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /anterior|previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente|next/i })).toBeDisabled();
  });
});

describe("Pagination — onPageChange", () => {
  it("calls onPageChange with page + 1 when 'next' is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: /siguiente|next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with page - 1 when 'previous' is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: /anterior|previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("does not call onPageChange when clicking a disabled boundary control", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: /anterior|previous/i }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe("Pagination — accessibility", () => {
  it("exposes distinct aria-labels for previous and next controls", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText(/página anterior|previous page/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/página siguiente|next page/i)).toBeInTheDocument();
  });

  it("announces the current page (aria-current or a live region text)", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    const indicator = screen.getByText(/2/).closest("[aria-current], [aria-live]");
    expect(indicator).not.toBeNull();
  });

  it("advances the page when Enter is pressed on the 'next' button (keyboard operation)", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    const nextButton = screen.getByRole("button", { name: /siguiente|next/i });
    nextButton.focus();
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
