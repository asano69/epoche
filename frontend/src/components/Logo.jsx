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
  const size = () => props.size ?? 30;
  const icon = (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      style={{ width: `${size()}px`, height: `${size()}px` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 0C3.34315 0 2 1.34315 2 3V13C2 14.6569 3.34315 16 5 16H14V14H4V12H14V0H5Z"
        fill="#84bce4"
      />
    </svg>
  );
  // Scales with the icon: at the old default size (40px), this works
  // out to 24px, matching the previous fixed "text-2xl" class.
  const titleFontSize = () => size() * 0.6;
  const title = props.showTitle && (
    <div
      class="logo font-serif"
      style={{ "font-size": `${titleFontSize()}px` }}
    >
      {__APP_NAME__}
    </div>
  );
  // Wraps `children` in whatever interactive element this instance
  // needs: a plain button when onClick is given (takes priority over
  // linkable), a home link with the original hover effects when
  // linkable, or a plain flex container otherwise (Login's case).
  const wrap = (children) =>
    props.onClick ? (
      <button type="button" onClick={props.onClick} class="contents">
        {children}
      </button>
    ) : props.linkable ? (
      <A
        href="/"
        class="group flex items-center gap-2 transition-opacity hover:opacity-60 hover:scale-[1.02]"
      >
        {children}
      </A>
    ) : (
      <div class="flex items-center gap-2">{children}</div>
    );

  return wrap(
    <>
      {icon}
      {title}
    </>
  );
}
