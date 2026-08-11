import EllipsisVertical from "lucide-solid/icons/ellipsis-vertical";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import pb from "../../lib/pb";

// Dropdown menu in the top-right corner, currently holding just logout.
// Split out of TopBar so TopBar stays focused on layout (toggle + logo)
// and this file can grow its own menu items without bloating TopBar.
export default function UserMenu() {
  const handleLogout = () => {
    pb.authStore.clear();
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        aria-label="Open menu"
        class="rounded-md p-1 transition-colors hover:bg-hover-bg"
      >
        <EllipsisVertical size={24} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 min-w-[160px] rounded-md border border-border-soft bg-card p-1 shadow-popover outline-none font-sans">
          <DropdownMenu.Item
            onSelect={handleLogout}
            class="cursor-pointer rounded-sm px-2 py-1.5 text-sm text-text outline-none transition-colors hover:bg-hover-bg data-[highlighted]:bg-hover-bg"
          >
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
