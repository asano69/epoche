import { DropdownMenu as KobalteDropdownMenu } from "@kobalte/core/dropdown-menu";

// Wraps Kobalte's DropdownMenu so callers don't need to know the
// dropdown-menu__* class names or the open/close animation; that
// styling lives here and in style.css instead of being repeated at
// every call site.
//
// Note: KobalteDropdownMenu.Content/.Item are captured into local
// constants *before* being reassigned below. DropdownMenu is only a
// reference to the same object as KobalteDropdownMenu, not a copy, so
// overwriting a property on one overwrites it on the other -- without
// this capture, the wrapper below would end up calling itself.
const { Content: KobalteContent, Item: KobalteItem } = KobalteDropdownMenu;

const DropdownMenu = KobalteDropdownMenu;

DropdownMenu.Content = (props) => (
  <KobalteContent {...props} class="dropdown-menu__content" />
);

DropdownMenu.Item = (props) => (
  <KobalteItem {...props} class="dropdown-menu__item" />
);

export default DropdownMenu;
