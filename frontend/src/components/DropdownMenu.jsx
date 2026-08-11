import { DropdownMenu as KobalteDropdownMenu } from "@kobalte/core/dropdown-menu";

// Wraps Kobalte's DropdownMenu so callers don't need to know the
// dropdown-menu__* class names or the open/close animation; that
// styling lives here and in style.css instead of being repeated at
// every call site.
const DropdownMenu = KobalteDropdownMenu;

DropdownMenu.Content = (props) => (
  <KobalteDropdownMenu.Content {...props} class="dropdown-menu__content" />
);

DropdownMenu.Item = (props) => (
  <KobalteDropdownMenu.Item {...props} class="dropdown-menu__item" />
);

export default DropdownMenu;
