/**
 * Component tests for PaymentsPage — the validation queue.
 *
 * Covers the four behavioural decisions of the Fase 3 redesign, each of which
 * was a measured defect before it:
 *   1. the screen opens on Pendientes, not on "Todas";
 *   2. every row is operable from the keyboard through a real button (the old
 *      `<tr onClick>` was unreachable without a mouse);
 *   3. approving or rejecting advances to the next pending request instead of
 *      dumping the admin back into an unfiltered list;
 *   4. "Aprobar" is gated on a real checklist, not on static prose.
 * Plus the pre-existing approve-confirmation and voucher-preview contracts.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { UNDO_WINDOW_MS } from "@/lib/deferred-commit";
import PaymentsPage from "@/app/payments/page";
import type { PaymentValidationRequest } from "@/services/api";
import { ToastProvider } from "@/contexts/ToastContext";
import ToastContainer from "@/components/ToastContainer";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// AppShell (the page's sidebar layout) needs next/navigation, next/link,
// next/image, and AuthContext — none of which this page uses directly.
// Mocked minimally, matching the pattern in Header.test.tsx / AppShell.test.tsx.
vi.mock("next/navigation", () => ({
  usePathname: () => "/payments",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const { fill, priority, sizes, ...rest } = props;
    void fill;
    void priority;
    void sizes;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: {
      user: { id: "u1", name: "Admin Test", email: "admin@cataclub.com", role: "admin", representanteId: null },
      roles: ["ADMINISTRADOR"],
      loggedInAt: "2026-07-01T12:00:00Z",
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mockFetchPaymentValidations = vi.fn();
const mockUpdatePaymentValidation = vi.fn();

vi.mock("@/services/api", () => ({
  fetchPaymentValidations: () => mockFetchPaymentValidations(),
  updatePaymentValidation: (id: string, dto: unknown) =>
    mockUpdatePaymentValidation(id, dto),
}));

const PENDING_REQUEST: PaymentValidationRequest = {
  id: "req-1",
  studentName: "Juan Pérez",
  responsablePagoName: "María Pérez",
  membershipPeriod: "01/07/2026 – 12/08/2026",
  membershipType: "Mensual",
  expectedAmount: 50,
  paymentMethod: "Transferencia",
  uploadedAt: "2026-07-01T10:00:00.000Z",
  currentMembershipStatus: "vencida",
  proofFileName: "comprobante.pdf",
  proofFileType: "pdf",
  validationStatus: "pendiente",
  startDate: "2026-07-01",
  endDate: "2026-07-31",
};

const SECOND_PENDING: PaymentValidationRequest = {
  ...PENDING_REQUEST,
  id: "req-2",
  studentName: "Sofia Vera",
  responsablePagoName: "Laura Vera",
  expectedAmount: 25,
};

const RESOLVED_REQUEST: PaymentValidationRequest = {
  ...PENDING_REQUEST,
  id: "req-3",
  studentName: "Kevin Sabando",
  validationStatus: "validado",
  validatedAt: "2026-07-05T10:00:00.000Z",
  validatedBy: "Admin Dev",
};

function renderPage(): void {
  render(<ToastProvider><PaymentsPage /></ToastProvider>);
}

/**
 * The queue renders twice — a table at `md` and up, cards below it — and jsdom
 * evaluates no media query, so both are in the document. Every queue assertion
 * scopes itself to one of the two on purpose.
 */
/**
 * Both the toast and the queue's hold indicator are `role="status"`, which is
 * right for both — they are each announcing an outcome. Tests have to say
 * which one they mean.
 */
async function liveRegionSaying(text: RegExp): Promise<HTMLElement> {
  return waitFor(() => {
    const match = screen
      .getAllByRole("status")
      .find((region) => text.test(region.textContent ?? ""));
    if (!match) throw new Error(`No live region matching ${text}`);
    return match;
  });
}

function queueTable(): HTMLElement {
  return screen.getByTestId("payments-table");
}

/** Open a request from the queue the way a keyboard user would: via its button. */
async function openRequest(studentName: string): Promise<void> {
  await screen.findByTestId("payments-table");
  const action = within(queueTable()).getByRole("button", {
    name: new RegExp(`(revisar el|ver el detalle del) pago de ${studentName}`, "i"),
  });
  fireEvent.click(action);
}

/** Tick every checklist item, which is what unlocks "Aprobar pago". */
function completeChecklist(): void {
  const group = screen.getByRole("group", { name: /antes de aprobar/i });
  for (const box of within(group).getAllByRole("checkbox")) {
    fireEvent.click(box);
  }
}

async function openPendingWithChecklistDone(): Promise<void> {
  renderPage();
  await openRequest("Juan Pérez");
  await screen.findByRole("button", { name: /aprobar pago/i });
  completeChecklist();
}

/**
 * Node's jsdom here ships no `localStorage` (the experimental global needs
 * `--localstorage-file`), and the queue now remembers its filter there.
 */
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    get length(): number {
      return Object.keys(store).length;
    },
  } as Storage;
}

beforeEach(() => {
  // Each case starts with no remembered filter, so one case's choice cannot
  // decide where the next one opens.
  vi.stubGlobal("localStorage", createMemoryStorage());
  // A decision is held for a few seconds before it is sent, so the undo window
  // is something every case has to be able to step over deliberately.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockFetchPaymentValidations.mockReset().mockResolvedValue([PENDING_REQUEST]);
  mockUpdatePaymentValidation.mockReset().mockImplementation((id: string) =>
    Promise.resolve({ ...PENDING_REQUEST, id, validationStatus: "validado" }),
  );
});

afterEach(() => {
  // Unmount first: leaving the screen FLUSHES a held decision, and that must
  // happen while the fake timers are still installed.
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// 1. The queue opens on the work of the day
// ---------------------------------------------------------------------------

describe("PaymentsPage — opens on the pending queue", () => {
  it("defaults the state filter to Pendientes instead of Todas", async () => {
    mockFetchPaymentValidations.mockResolvedValue([PENDING_REQUEST, RESOLVED_REQUEST]);
    renderPage();

    const pendientes = await screen.findByRole("button", { name: /^pendientes/i });
    expect(pendientes).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^todas/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows only pending requests until the admin asks for the rest", async () => {
    mockFetchPaymentValidations.mockResolvedValue([PENDING_REQUEST, RESOLVED_REQUEST]);
    renderPage();

    await screen.findByTestId("payments-table");
    expect(within(queueTable()).getByText("Juan Pérez")).toBeInTheDocument();
    expect(within(queueTable()).queryByText("Kevin Sabando")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^todas/i }));
    expect(within(queueTable()).getByText("Kevin Sabando")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Keyboard operability
// ---------------------------------------------------------------------------

describe("PaymentsPage — the queue is operable without a mouse", () => {
  it("opens a request from a real, named button rather than a click handler on the row", async () => {
    renderPage();

    await screen.findByTestId("payments-table");
    const action = within(queueTable()).getByRole("button", { name: /revisar el pago de Juan Pérez/i });
    // A `<button>` is focusable and Enter/Space-activatable by construction —
    // which the old `<tr onClick>` (no tabIndex, no role, no onKeyDown) was not.
    expect(action.tagName).toBe("BUTTON");

    fireEvent.click(action);
    expect(await screen.findByRole("button", { name: /aprobar pago/i })).toBeInTheDocument();
  });

  it("leaves the table rows themselves inert, so there is no invisible click target", async () => {
    renderPage();
    await screen.findByTestId("payments-table");

    for (const row of document.querySelectorAll("tbody tr")) {
      expect(row).not.toHaveAttribute("tabindex");
      expect(row).not.toHaveAttribute("role");
      expect(row.className).not.toContain("cursor-pointer");
    }
  });

  it("labels the action by outcome for already-resolved requests", async () => {
    mockFetchPaymentValidations.mockResolvedValue([RESOLVED_REQUEST]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /^todas/i }));
    await screen.findByTestId("payments-table");
    expect(
      within(queueTable()).getByRole("button", { name: /ver el detalle del pago de Kevin Sabando/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2b. Focus follows the view swap
// ---------------------------------------------------------------------------

describe("PaymentsPage — focus follows the queue ⇄ detail swap", () => {
  /** The detail's heading, which is where focus is supposed to land. */
  function detailHeading(): HTMLElement {
    return screen.getByRole("heading", { name: /detalle de la solicitud/i });
  }

  it("moves focus into the detail when a request opens", async () => {
    renderPage();
    await openRequest("Juan Pérez");

    // Opening replaces the queue in place, so the button that was focused is
    // unmounted; without this the browser drops focus to <body> and a keyboard
    // admin restarts from the top of the document.
    await waitFor(() => expect(document.activeElement).toBe(detailHeading()));
    expect(detailHeading()).toHaveAttribute("tabindex", "-1");
  });

  it("returns focus to the row action it came from", async () => {
    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByRole("button", { name: /volver a la cola/i });

    fireEvent.click(screen.getByRole("button", { name: /volver a la cola/i }));

    await screen.findByTestId("payments-table");
    const action = within(queueTable()).getByRole("button", {
      name: /revisar el pago de Juan Pérez/i,
    });
    await waitFor(() => expect(document.activeElement).toBe(action));
  });

  it("does not pretend to be a modal", async () => {
    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByRole("button", { name: /volver a la cola/i });

    // An in-page view swap, not a dialog: no `role="dialog"`, no `aria-modal`,
    // no focus trap. Calling it a dialog would promise a background that is
    // still there and an Escape key that closes it.
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector("[aria-modal]")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Queue position and auto-advance
// ---------------------------------------------------------------------------

describe("PaymentsPage — the detail view keeps the admin's place in the queue", () => {
  beforeEach(() => {
    mockFetchPaymentValidations.mockResolvedValue([PENDING_REQUEST, SECOND_PENDING]);
  });

  it("states the position in the pending queue", async () => {
    renderPage();
    await openRequest("Juan Pérez");

    expect(await screen.findByText("Pendiente 1 de 2")).toBeInTheDocument();
  });

  it("moves to the next pending request without going back to the list", async () => {
    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByText("Pendiente 1 de 2");

    fireEvent.click(screen.getByRole("button", { name: /pendiente siguiente/i }));

    expect(await screen.findByText("Pendiente 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pendiente siguiente/i })).toBeDisabled();
  });

  it("advances to the next pending request after an approval", async () => {
    mockUpdatePaymentValidation.mockResolvedValue({
      ...PENDING_REQUEST,
      validationStatus: "validado",
    });
    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByRole("button", { name: /aprobar pago/i });
    completeChecklist();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    // The queue lost one item, and the admin is now on the survivor.
    expect(await screen.findByText("Pendiente 1 de 1")).toBeInTheDocument();
    expect(screen.getAllByText("Sofia Vera").length).toBeGreaterThan(0);
  });

  it("returns to the list when the queue is emptied", async () => {
    mockFetchPaymentValidations.mockResolvedValue([PENDING_REQUEST]);
    mockUpdatePaymentValidation.mockResolvedValue({
      ...PENDING_REQUEST,
      validationStatus: "validado",
    });
    await openPendingWithChecklistDone();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /aprobar pago/i })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /^pendientes/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. The checklist gates the approval
// ---------------------------------------------------------------------------

describe("PaymentsPage — the checklist gates 'Aprobar'", () => {
  it("keeps 'Aprobar pago' disabled until every item is confirmed", async () => {
    renderPage();
    await openRequest("Juan Pérez");

    const approve = await screen.findByRole("button", { name: /aprobar pago/i });
    expect(approve).toBeDisabled();

    completeChecklist();
    expect(screen.getByRole("button", { name: /aprobar pago/i })).toBeEnabled();
  });

  it("names the expected amount inside the item that checks it", async () => {
    renderPage();
    await openRequest("Juan Pérez");

    expect(
      await screen.findByText("El monto del comprobante coincide con $50,00"),
    ).toBeInTheDocument();
  });

  it("re-locks the approval when the admin moves to another request", async () => {
    mockFetchPaymentValidations.mockResolvedValue([PENDING_REQUEST, SECOND_PENDING]);
    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByRole("button", { name: /aprobar pago/i });
    completeChecklist();

    fireEvent.click(screen.getByRole("button", { name: /pendiente siguiente/i }));

    expect(await screen.findByRole("button", { name: /aprobar pago/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Rejection — typified reason, sent verbatim to the payer
// ---------------------------------------------------------------------------

describe("PaymentsPage — rejection", () => {
  it("blocks the rejection until a reason is chosen", async () => {
    renderPage();
    await openRequest("Juan Pérez");
    fireEvent.click(await screen.findByRole("button", { name: /rechazar pago/i }));

    expect(screen.getByRole("button", { name: /rechazar y avisar/i })).toBeDisabled();
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });

  it("sends the chosen reason, with the optional note appended", async () => {
    mockUpdatePaymentValidation.mockResolvedValue({
      ...PENDING_REQUEST,
      validationStatus: "rechazado",
      rejectionReason: "El monto no coincide",
    });
    renderPage();
    await openRequest("Juan Pérez");
    fireEvent.click(await screen.findByRole("button", { name: /rechazar pago/i }));

    fireEvent.click(screen.getByRole("radio", { name: /el monto no coincide/i }));
    fireEvent.change(screen.getByLabelText(/nota para el responsable/i), {
      target: { value: "El comprobante dice $20,00." },
    });
    fireEvent.click(screen.getByRole("button", { name: /rechazar y avisar/i }));

    // The decision is HELD for a few seconds so it can still be undone; the
    // request goes out when that window closes.
    await act(async () => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
    });
    await waitFor(() => expect(mockUpdatePaymentValidation).toHaveBeenCalledTimes(1));
    expect(mockUpdatePaymentValidation).toHaveBeenCalledWith("req-1", {
      action: "rejected",
      rejectionReason: "El monto no coincide — El comprobante dice $20,00.",
    });
  });

  it("names the person who will receive the rejection", async () => {
    renderPage();
    await openRequest("Juan Pérez");
    fireEvent.click(await screen.findByRole("button", { name: /rechazar pago/i }));

    expect(
      screen.getByText(/María Pérez va a recibir este motivo tal cual/),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Pre-existing contracts kept green
// ---------------------------------------------------------------------------

describe("PaymentsPage — approve confirmation gating", () => {
  it("opens a confirmation dialog on 'Aprobar Pago' click without mutating yet", async () => {
    await openPendingWithChecklistDone();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });

  it("mutates the payment status only after the confirm control is activated", async () => {
    await openPendingWithChecklistDone();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    await act(async () => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
    });
    await waitFor(() => {
      expect(mockUpdatePaymentValidation).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdatePaymentValidation).toHaveBeenCalledWith("req-1", {
      action: "approved",
      startDate: "2026-07-01",
      endDate: "2026-08-01",
    });
  });

  it("leaves the payment status unchanged when the confirmation is canceled", async () => {
    await openPendingWithChecklistDone();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });
});

describe("PaymentsPage — voucher preview recovery", () => {
  it("replaces a failed voucher preview with a labeled download fallback", async () => {
    mockFetchPaymentValidations.mockResolvedValue([{ ...PENDING_REQUEST, proofPreviewUrl: "https://files.example/voucher.png", proofFileType: "image" }]);

    renderPage();
    await openRequest("Juan Pérez");
    fireEvent.error(await screen.findByRole("img", { name: /vista previa del comprobante/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Comprobante no disponible");
    expect(screen.getByRole("link", { name: /descargar comprobante/i })).toHaveAttribute("href", "https://files.example/voucher.png");
  });

  it("allows a reviewer to retry the preview without changing the payment", async () => {
    mockFetchPaymentValidations.mockResolvedValue([{ ...PENDING_REQUEST, proofPreviewUrl: "https://files.example/voucher.png", proofFileType: "image" }]);

    renderPage();
    await openRequest("Juan Pérez");
    fireEvent.error(await screen.findByRole("img", { name: /vista previa del comprobante/i }));
    fireEvent.click(screen.getByRole("button", { name: /reintentar vista previa/i }));

    expect(screen.getByRole("img", { name: /vista previa del comprobante/i })).toBeInTheDocument();
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });

  it("does not claim the preview is unavailable while the voucher image is rendering successfully", async () => {
    mockFetchPaymentValidations.mockResolvedValue([{ ...PENDING_REQUEST, proofPreviewUrl: "https://files.example/voucher.png", proofFileType: "image" }]);

    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByRole("img", { name: /vista previa del comprobante/i });

    expect(screen.queryByText(/vista previa no disponible/i)).not.toBeInTheDocument();
  });

  it("shows the unavailable message only when there is no preview URL at all", async () => {
    mockFetchPaymentValidations.mockResolvedValue([{ ...PENDING_REQUEST, proofPreviewUrl: undefined }]); // no proofPreviewUrl

    renderPage();
    await openRequest("Juan Pérez");

    expect(await screen.findByText(/vista previa no disponible/i)).toBeInTheDocument();
  });
});

describe("PaymentsPage — unrelated happy path", () => {
  it("does not add contextual help to the unrelated payment-review journey", async () => {
    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByRole("button", { name: /aprobar pago/i });

    expect(screen.queryByRole("button", { name: /ayuda sobre/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Mobile — the queue must not force the page sideways at 390px.
// ---------------------------------------------------------------------------

describe("PaymentsPage — 390px viewport", () => {
  it("lets the status filter chips wrap instead of forcing the page to scroll sideways", async () => {
    renderPage();

    const pendientes = await screen.findByRole("button", { name: /^pendientes/i });
    const filterRow = pendientes.parentElement as HTMLElement;

    expect(filterRow).toHaveClass("flex", "flex-wrap");
    expect(within(filterRow).getAllByRole("button").length).toBeGreaterThanOrEqual(4);
  });

  it("collapses the queue into cards below the table breakpoint", async () => {
    renderPage();
    await screen.findByTestId("payments-cards");

    const cards = screen.getByTestId("payments-cards");
    expect(cards.className).toContain("md:hidden");
    expect(within(cards).getByRole("button", { name: /revisar el pago de Juan Pérez/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// The checklist asks about the payment in front of the admin.
//
// It used to ask three questions about a receipt, always. On a cash payment
// taken at the desk there is no receipt, so approving meant affirming that a
// document that does not exist is legible, that its amount matches and that
// its date is in range. A safeguard you have to falsify to do your job teaches
// that ticking boxes is a formality — and that lesson carries straight over to
// the transfers where the boxes are the only control there is.
// ---------------------------------------------------------------------------

describe("PaymentsPage — the approval checklist follows the evidence", () => {
  const CASH_AT_THE_DESK: PaymentValidationRequest = {
    ...PENDING_REQUEST,
    paymentMethod: "Efectivo",
    proofPreviewUrl: undefined,
    proofFileName: "Sin comprobante adjunto",
  };

  it("never asks about a receipt for cash taken at the desk", async () => {
    mockFetchPaymentValidations.mockResolvedValue([CASH_AT_THE_DESK]);
    renderPage();
    await openRequest("Juan Pérez");

    const group = await screen.findByRole("group", { name: /antes de aprobar/i });
    expect(within(group).queryByText(/comprobante/i)).not.toBeInTheDocument();
  });

  it("asks a cash payment the two things the admin can actually answer", async () => {
    mockFetchPaymentValidations.mockResolvedValue([CASH_AT_THE_DESK]);
    renderPage();
    await openRequest("Juan Pérez");

    const group = await screen.findByRole("group", { name: /antes de aprobar/i });
    const boxes = within(group).getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(within(group).getByText(/Recibí \$50,00 en efectivo, en persona/)).toBeInTheDocument();
  });

  it("still gates the approval behind the shorter list", async () => {
    mockFetchPaymentValidations.mockResolvedValue([CASH_AT_THE_DESK]);
    renderPage();
    await openRequest("Juan Pérez");

    const approve = await screen.findByRole("button", { name: /aprobar pago/i });
    expect(approve).toBeDisabled();

    completeChecklist();
    expect(approve).toBeEnabled();
  });

  it("keeps the receipt questions for a transfer", async () => {
    renderPage();
    await openRequest("Juan Pérez");

    const group = await screen.findByRole("group", { name: /antes de aprobar/i });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(3);
    expect(
      within(group).getByText("El comprobante es legible y no está cortado"),
    ).toBeInTheDocument();
  });

  it("offers a cash payment a rejection reason the payer can act on", async () => {
    mockFetchPaymentValidations.mockResolvedValue([CASH_AT_THE_DESK]);
    renderPage();
    await openRequest("Juan Pérez");

    fireEvent.click(await screen.findByRole("button", { name: /rechazar/i }));

    expect(await screen.findByLabelText(/No se recibió el pago/i)).toBeInTheDocument();
    // "El comprobante no se lee" is unusable advice for someone who paid cash.
    expect(screen.queryByLabelText(/El comprobante no se lee/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Undo on a decision that cannot be taken back afterwards.
//
// Approving flips the payment, activates the membership and hands a receipt to
// a worker that generates a PDF. Reverting that on the server would not be an
// undo — it would be a membership that blinked active and a receipt already
// sent for a payment now pending again. So the decision is HELD for a few
// seconds: the queue moves at once, and "Deshacer" cancels something that
// never happened.
// ---------------------------------------------------------------------------

describe("PaymentsPage — a decision stays reversible for a few seconds", () => {
  function renderWithToasts(): void {
    render(
      <ToastProvider>
        <PaymentsPage />
        <ToastContainer />
      </ToastProvider>,
    );
  }

  async function approveJuan(): Promise<void> {
    renderWithToasts();
    await openRequest("Juan Pérez");
    await screen.findByRole("button", { name: /aprobar pago/i });
    completeChecklist();
    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));
  }

  it("offers the undo on the confirmation itself", async () => {
    await approveJuan();

    const toast = await liveRegionSaying(/Pago aprobado/);
    expect(within(toast).getByRole("button", { name: "Deshacer" })).toBeInTheDocument();
  });

  it("never sends the decision when the undo is taken", async () => {
    await approveJuan();

    const toast = await liveRegionSaying(/Pago aprobado/);
    fireEvent.click(within(toast).getByRole("button", { name: "Deshacer" }));

    await act(async () => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS * 2);
    });
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });

  it("puts the admin back in front of the payment they had just decided", async () => {
    await approveJuan();

    const toast = await liveRegionSaying(/Pago aprobado/);
    fireEvent.click(within(toast).getByRole("button", { name: "Deshacer" }));

    // Undo returns the whole situation, not just the row: the payment is
    // pending again AND the admin is looking at it, which is where they were
    // when they made the call they took back.
    expect(await screen.findByRole("button", { name: /aprobar pago/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rechazar pago/i })).toBeInTheDocument();
  });

  it("sends the decision once the window closes", async () => {
    await approveJuan();

    await act(async () => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
    });

    expect(mockUpdatePaymentValidation).toHaveBeenCalledTimes(1);
  });

  it("returns the payment to the queue and says so when a held decision fails", async () => {
    mockUpdatePaymentValidation.mockRejectedValue(new Error("500"));
    await approveJuan();

    await act(async () => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
    });

    // No control is left to attach the failure to, so it has to travel to them.
    expect(await screen.findByText("No se pudo aprobar el pago.")).toBeInTheDocument();
    expect(
      screen.getByText("Juan Pérez volvió a la cola de pendientes."),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// The queue remembers where the admin works from.
//
// Whoever validates payments opens this screen on "Pendientes" every morning
// because that is the job. Making them re-pick it on every visit is a tax on
// the screen they use most, and it was the other half of the P7 backlog item
// that had not moved since the prototype.
// ---------------------------------------------------------------------------

describe("PaymentsPage — the chosen filter outlives the visit", () => {
  it("opens on Pendientes for an admin who has never chosen", async () => {
    renderPage();
    await screen.findByTestId("payments-table");

    expect(screen.getByRole("button", { name: /Pendientes/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("remembers the filter for the next visit", async () => {
    renderPage();
    await screen.findByTestId("payments-table");
    fireEvent.click(screen.getByRole("button", { name: /Todas/ }));

    cleanup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Todas/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });

  it("falls back to Pendientes when the stored filter no longer exists", async () => {
    // A key renamed in a later release would otherwise leave the admin looking
    // at an empty list with a pill highlighted that is not in the row.
    window.localStorage.setItem("cata:pref:payments-queue-filter", "PENDIENTE_VALIDACION");

    renderPage();
    await screen.findByTestId("payments-table");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Pendientes/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// A held decision is a state you are IN.
//
// The toast that announces it dismisses itself, can be dismissed by hand, and
// gets buried by the next one. So "did that actually go through?" needed an
// answer that lasts exactly as long as the hold does.
// ---------------------------------------------------------------------------

describe("PaymentsPage — the hold is visible while it lasts", () => {
  async function approveJuanBare(): Promise<void> {
    renderPage();
    await openRequest("Juan Pérez");
    await screen.findByRole("button", { name: /aprobar pago/i });
    completeChecklist();
    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));
  }

  it("names what is being held, on the queue itself", async () => {
    await approveJuanBare();

    expect(
      await screen.findByText(/Aprobación de Juan Pérez — se envía en unos segundos/),
    ).toBeInTheDocument();
  });

  it("clears the indicator once the decision is actually sent", async () => {
    await approveJuanBare();
    await screen.findByText(/Aprobación de Juan Pérez/);

    await act(async () => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
    });

    await waitFor(() =>
      expect(screen.queryByText(/se envía en unos segundos/)).not.toBeInTheDocument(),
    );
  });

  it("offers a second way back that does not depend on the toast surviving", async () => {
    await approveJuanBare();
    const banner = await liveRegionSaying(/se envía en unos segundos/);

    fireEvent.click(within(banner).getByRole("button", { name: "Deshacer" }));

    await act(async () => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS * 2);
    });
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });

  it("says a rejection is a rejection, not an approval", async () => {
    renderPage();
    await openRequest("Juan Pérez");
    fireEvent.click(await screen.findByRole("button", { name: /rechazar pago/i }));
    fireEvent.click(screen.getByRole("radio", { name: /el monto no coincide/i }));
    fireEvent.click(screen.getByRole("button", { name: /rechazar y avisar/i }));

    expect(await screen.findByText(/Rechazo de Juan Pérez/)).toBeInTheDocument();
  });
});
