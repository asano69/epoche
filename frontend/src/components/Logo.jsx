import { createResource, Show } from "solid-js";
import { A } from "@solidjs/router";

// size: overall pixel size of the icon (width == height). Defaults to
// 40px (the old fixed "h-10 w-10" Tailwind size).
// showTitle: whether to render "App Title" next to the icon.
// linkable: whether clicking the logo navigates home ("/"). Defaults to
// false, since Login renders pre-auth where there's nowhere to navigate
// to yet -- it uses Logo without linkable and gets plain text/icon.
// onClick: if provided, the logo becomes a plain clickable button
// instead of a link, and `linkable` is ignored.
export default function Logo(props) {
  // Fetches the running server version from the public, unauthenticated
  // /api/version endpoint (see internal/serve/handler.go), instead of
  // hardcoding it here.
  const [version] = createResource(async () => {
    const res = await fetch("/api/version");
    const data = await res.json();
    return data.version;
  });

  const size = () => props.size ?? 30;
  const icon = (
    // stroke uses currentColor instead of a fixed hex, so the icon
    // follows whatever text color is in scope. Since body already sets
    // text-text (see base.css), and --color-text is defined with
    // light-dark() in theme.css, this adapts to light/dark mode with no
    // extra CSS needed here.
    <svg
      viewBox="0 0 24 24"
      fill="none"
      transform="matrix(1, 0, 0, -1, 0, 0)"
      style={{ width: `${size()}px`, height: `${size()}px` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.4155 15.3411C18.5924 17.3495 14.8895 17.5726 11.877 16M2.58445 8.65889C5.41439 6.64566 9.12844 6.42638 12.1448 8.01149M15.3737 14.1243C18.2604 12.305 19.9319 8.97413 19.601 5.51222M8.58184 9.90371C5.72231 11.7291 4.06959 15.0436 4.39878 18.4878M15.5269 10.137C15.3939 6.72851 13.345 3.61684 10.1821 2.17222M8.47562 13.9256C8.63112 17.3096 10.6743 20.392 13.8177 21.8278M19.071 4.92893C22.9763 8.83418 22.9763 15.1658 19.071 19.071C15.1658 22.9763 8.83416 22.9763 4.92893 19.071C1.02369 15.1658 1.02369 8.83416 4.92893 4.92893C8.83418 1.02369 15.1658 1.02369 19.071 4.92893ZM14.8284 9.17157C16.3905 10.7337 16.3905 13.2663 14.8284 14.8284C13.2663 16.3905 10.7337 16.3905 9.17157 14.8284C7.60948 13.2663 7.60948 10.7337 9.17157 9.17157C10.7337 7.60948 13.2663 7.60948 14.8284 9.17157Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
  // Scales with the icon: at the old default size (40px), this works
  // out to 24px, matching the previous fixed "text-2xl" class.
  const titleFontSize = () => size() * 0.6;
  const title = () =>
    props.showTitle && (
      <div
        class="logo font-display"
        style={{ "font-size": `${titleFontSize()}px` }}
      >
        {__APP_NAME__}
      </div>
    );
  // Wraps `children` in whatever interactive element this instance
  // needs: a plain button when onClick is given (takes priority over
  // linkable), a home link with the original hover effects when
  // linkable, or a plain flex container otherwise (Login's case).
  const Wrap = (p) =>
    props.onClick ? (
      <button type="button" onClick={props.onClick} class="contents">
        {p.children}
      </button>
    ) : props.linkable ? (
      <A
        href="/"
        class="group flex items-center gap-2 transition-opacity hover:opacity-60 hover:scale-[1.02]"
      >
        {p.children}
      </A>
    ) : (
      <div class="flex items-center gap-2">{p.children}</div>
    );
  return (
<div class="flex items-center gap-2">
    <Wrap>
      {icon}
      {title()}
    </Wrap>
          {/* Rendered outside Wrap so it's never part of the clickable
          logo (button/link). */}
      <Show when={version()}>
        <span class="font-mono text-xs">v{version()}</span>
      </Show>
    </div>
  );
}
