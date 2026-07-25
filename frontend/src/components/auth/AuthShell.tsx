/**
 * AuthShell — the ONE template every public auth screen inherits.
 *
 * ## Which prototype is the authority
 *
 * `docs/ux/prototipo-rediseno.html` — the approved 14-view prototype, login
 * section at `<section class="stage" id="stage-login">`. `docs/ux/prototipos/`
 * supersedes it for the ADMIN shell, but NOT for these four screens: the small
 * `prototipos/01-login.html` composition is a different, reduced design, and
 * building against it is what produced the broken screen this file replaces.
 * Every number below is transcribed from the 14-view file (CSS at its lines
 * 226-243, login instance overrides at 789-814, phone rules at 416-417).
 *
 * ## The composition FILLS THE VIEWPORT — this overrides the prototype
 *
 * The prototype bounds `.auth` at `min-height:660px` and centres it as an
 * artboard on a deeper page field. That is what shipped first, and the product
 * owner rejected it on sight: *"por qué el login no ocupa toda la pantalla"*.
 * A user decision beats a prototype measurement, so the composition is now
 * edge-to-edge — no max-width, no outer padding, no frame (border, radius,
 * elevation) around it, because a full-bleed split has no artboard to frame.
 *
 * Everything the prototype established that was NOT objected to survives
 * verbatim: the 42px headline (30px on phones), the coal panel wider than the
 * form panel, the red eyebrow, the ringed logo, the inline figure row, the red
 * links.
 *
 * The two panels are NOT equal halves: `.auth .dark { flex:1.1 }` against
 * `.auth .light { flex:1 }`. The coal panel is the wider one, because it
 * carries the 42px headline that is the whole point of the screen. Rendering
 * that headline at half its size (21px) is what made the screen read as
 * broken; it is `font-size:42px; font-weight:800; letter-spacing:-1.5px;
 * line-height:1.12; max-width:15ch; text-wrap:balance`, dropping to 30px on
 * phones (line 417).
 *
 * ## How the coal panel earns a full viewport instead of becoming a void
 *
 * At 660px the prototype's `justify-content:space-between` (link top, cluster
 * centred, copyright bottom) was enough. At 900px+ it is not: the same three
 * items in twice the height leave the brand cluster floating with nothing
 * under it, which is the "panel vacío" complaint the bounded version was
 * introduced to answer. Two changes make the height deliberate:
 *
 *   1. The panel is a `auto / 1fr / auto` GRID, not a space-between flex. The
 *      exit link and the closing rail hug the edges at their natural heights
 *      and the brand cluster is centred in what is left — so the cluster is
 *      optically centred no matter how unequal the two rails are, which
 *      `space-between` cannot do.
 *   2. The figure row moves OUT of the centre cluster and pairs with the
 *      copyright as the closing rail. It stays the same INLINE baseline row
 *      over a `--coal-3` hairline (`display:flex; align-items:baseline;
 *      gap:10px`) — a number and its caption on one line, never a stacked
 *      divider/number/caption — it just anchors the bottom third instead of
 *      leaving it empty. Centre = who we are; bottom = how long we have been.
 *
 * A single soft radial behind the brand mark gives the dark field depth, so
 * the air around the logo reads as a lit stage rather than as unpainted space.
 * It is one authored moment, suppressed on phones where there is no air.
 *
 * ## Phones stack, they do not hide
 *
 * `@media (max-width:980px){ .auth{flex-direction:column} }` — the coal panel
 * moves ABOVE the form, it is not removed. (The other prototype hid it; this
 * one is the authority here.) So there is no separate compact brand block.
 *
 * ## The single figure is the club's age, not a student count
 *
 * The prototype draws "67 estudiantes inscritos". That exact figure CANNOT be
 * rendered honestly: no endpoint an UNAUTHENTICATED visitor can call returns a
 * student count — `GET /dashboard/stats` and `GET /membresias/estadisticas`
 * both sit behind `GestorPermisos(["ADMINISTRADOR"])`, so a public caller gets
 * a 401 before any handler runs. An earlier revision filled the slot from
 * `src/mocks/*.ts`, i.e. it showed an invented number to every visitor.
 *
 * What is rendered instead is `yearsSinceFounding()`, derived from
 * `FOUNDING_DATE` — the constant of record the landing has published since its
 * first release ("Fundado el 10 de octubre"). Public, verifiable, no backend,
 * cannot drift. Same slot, same inline `<b>` + `<small>` shape, honest number.
 *
 * No client-only APIs are used here, so this stays server-safe.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HelpChatLauncher from "@/components/chatbot/HelpChatLauncher";
import { yearsSinceFounding } from "@/app/landing/landing-config";

/**
 * `.input` (prototype line 82) — 40px, 10px radius, hairline border on paper,
 * 13px text. Shared by all four auth screens so the field height is a token,
 * not a per-screen guess.
 */
export const AUTH_INPUT_CLASSES =
  "h-ctl w-full rounded-ctl border border-line-2 bg-paper px-[13px] text-[13.5px] text-ink " +
  "transition-colors placeholder:text-ink-3 focus:border-cata-red focus:outline-none " +
  "focus:ring-[3px] focus:ring-cata-red/10 disabled:cursor-not-allowed disabled:opacity-50";

/** `.field label` (line 239) — 12.5px/600, 6px below the control. */
export const AUTH_LABEL_CLASSES = "mb-1.5 block text-[12.5px] font-semibold text-ink";

/**
 * The muted ink used on coal (`#8B8B93`) and the brighter supporting line
 * (`#B9B9C1`). Both are prototype literals with no product token: the `ink-*`
 * ramp is defined for light surfaces only.
 */
const ON_COAL_MUTED = "text-[#8B8B93]";
const ON_COAL_SUPPORT = "text-[#B9B9C1]";

export interface AuthShellProps {
  /** `.fcard h2` — the form's own heading, e.g. "Bienvenido de nuevo". */
  title: string;
  /** `.fcard .sub` — optional supporting line directly under the title. */
  subtitle?: string;
  /**
   * The small print rendered BELOW the card (line 814): the security note on
   * /login, the "el enlace vencido" escape hatch on /reset-password.
   */
  note?: React.ReactNode;
  /** The screen's form, rendered inside the elevated card. */
  children: React.ReactNode;
}

/** `.fcard` is `max-width:360px` — the single card width for all three screens. */
const CARD_WIDTH = "max-w-[360px]";

export default function AuthShell({
  title,
  subtitle,
  note,
  children,
}: AuthShellProps): React.ReactElement {
  const years = yearsSinceFounding();

  return (
    /*
     * The composition IS the page — full viewport, no artboard, no frame. The
     * `auth-shell` class stays: `globals.css` keys the chrome-less layout off
     * `.app-main:has(.auth-shell)`.
     */
    <div
      data-testid="auth-composition"
      className="auth-shell flex min-h-screen w-full flex-col bg-canvas min-[980px]:flex-row"
    >
      {/*
       * `.auth .dark` — `flex:1.1`, i.e. WIDER than the form panel. Laid out
       * as `auto / 1fr / auto`: the exit link and the closing rail take their
       * natural heights at the edges and the brand cluster centres in what is
       * left, which is what keeps a full-height panel from reading as empty.
       */}
      <div
        data-testid="auth-panel-dark"
        className="relative grid grid-rows-[auto_1fr_auto] gap-8 overflow-hidden bg-coal px-6 py-8 text-center text-white min-[980px]:flex-[1.1_1_0%] min-[980px]:gap-10 min-[980px]:px-14 min-[980px]:py-12"
      >
        {/*
         * The lit stage. One soft radial centred on the brand mark so the dark
         * field has depth instead of being unpainted space. Phones have no air
         * to light, so it only exists from 980px up.
         *
         * Contrast, measured rather than assumed: the gradient fades out at 68%
         * of its 340px radius, i.e. ~231px from centre, and every muted line on
         * this panel sits outside that — the exit link ~475px away, the figure
         * caption ~310px, the copyright ~384px — so they keep `ON_COAL_MUTED`'s
         * full 5.49:1 on bare coal. `ON_COAL_SUPPORT`, which IS inside the lit
         * area, measures 7.85:1 there. Even the impossible case (muted text at
         * the exact centre, where the logo is) holds 4.53:1, so the effect
         * cannot push anything below AA.
         */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.075),rgba(255,255,255,0)_68%)] min-[980px]:block"
        />

        <Link
          href="/"
          className={`relative z-[1] inline-flex items-center gap-1.5 justify-self-start text-[13px] transition-colors hover:text-white ${ON_COAL_MUTED}`}
        >
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
          Volver al sitio
        </Link>

        {/* The centred cluster — `gap:22px`, `max-width:44ch` (line 792). */}
        <div className="relative z-[1] flex flex-col items-center justify-center gap-[22px] justify-self-center [max-width:44ch]">
          {/* 104px, `border:4px solid rgba(255,255,255,.12)` + drop shadow. */}
          <span className="relative block h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full border-4 border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <Image
              src="/brand/cata-club-logo.jpeg"
              alt="Cata Club"
              fill
              sizes="104px"
              className="object-cover"
              priority
            />
          </span>

          {/*
           * `.headline` — 42px/800/-1.5px, 30px on phones. Kept as a <p>:
           * the page's single <h1> is the form title, and the motto is
           * brand copy, not the heading of a section a user navigates to.
           *
           * The quotation marks are the typographic pair the 14-view
           * prototype uses (line 794). Guillemets shipped here by mistake,
           * copied from the reduced `prototipos/01-login.html`, and the
           * product owner rejected them outright: *"esos signos de mayor y
           * menor se ven muy mal"*. They stack badly against a centred,
           * balanced headline — the wedge points sit on the optical margin
           * and pull the first and last lines out of alignment.
           */}
          <p
            data-testid="auth-headline"
            className="my-5 max-w-[15ch] text-[30px] font-extrabold leading-[1.12] tracking-[-1.5px] [text-wrap:balance] min-[980px]:my-0 min-[980px]:text-[42px]"
          >
            “Formando <em className="not-italic text-ball">campeones</em> para la vida”
          </p>

          {/* The supporting line — 14.5px, `margin:-6px 0 0`. */}
          <p className={`-mt-1.5 text-[14.5px] ${ON_COAL_SUPPORT}`}>
            Cada entrenamiento es una oportunidad para superarte.
          </p>
        </div>

        {/*
         * The closing rail. The figure and the copyright together, so the
         * bottom third of a full-height panel carries weight.
         */}
        <div className="relative z-[1] flex flex-col items-center gap-4">
          {/*
           * The ONE figure — an inline baseline row over a `--coal-3`
           * hairline, not a stacked divider/number/caption.
           */}
          <p className="flex min-w-[240px] items-baseline justify-center gap-2.5 border-t border-coal-3 pt-[18px]">
            <b data-testid="auth-figure" className="text-[26px] font-extrabold tabular-nums">
              {years}
            </b>
            <small className={`text-[12.5px] ${ON_COAL_MUTED}`}>años formando deportistas</small>
          </p>

          {/* `.copy` — 12px, pinned to the bottom of the panel. */}
          <p className={`text-[12px] ${ON_COAL_MUTED}`}>© 2026 Cata Club — Tenis de Mesa</p>
        </div>
      </div>

      {/* `.auth .light` — `flex:1`, contents centred in the full column. */}
      <div className="flex flex-1 flex-col justify-center bg-canvas px-6 py-10 text-ink min-[980px]:flex-1 min-[980px]:px-14 min-[980px]:py-12">
        {/* `.fcard` — 360px, 18px radius, `padding:30px 28px`, elevated. */}
        <div
          className={`mx-auto flex w-full flex-col gap-3.5 rounded-[18px] border border-line bg-paper px-7 py-[30px] shadow-[0_12px_44px_rgba(0,0,0,0.07)] ${CARD_WIDTH}`}
        >
          {/* The red eyebrow — 10px/700, `letter-spacing:2px`, uppercase. */}
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-cata-red">
            Panel de gestión
          </p>
          <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink">{title}</h1>
          {subtitle && <p className="-mt-2 text-[13.5px] text-ink-3">{subtitle}</p>}
          {children}
        </div>

        {/* The note — outside the card, on purpose. `margin:16px auto 0`. */}
        {note && (
          <p
            className={`mx-auto mt-4 text-center text-[11.5px] leading-[1.5] text-ink-3 ${CARD_WIDTH}`}
          >
            {note}
          </p>
        )}

        {/*
         * The assistant, reachable BEFORE signing in — it answers "¿cómo
         * inicio sesión?" and "¿cuáles son los horarios?" without an account,
         * and `POST /chatbot` is public. It lives in the small print rather
         * than as the floating button it used to be, which covered this very
         * form. One placement here covers /login, /forgot-password and
         * /reset-password, since all three inherit this shell.
         */}
        <p className={`mx-auto mt-3 text-center ${CARD_WIDTH}`}>
          <HelpChatLauncher variant="quiet" label="¿Necesita ayuda para entrar?" />
        </p>
      </div>
    </div>
  );
}
