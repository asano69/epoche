import Menu from "lucide-solid/icons/menu";
import X from "lucide-solid/icons/x";
import EllipsisVertical from "lucide-solid/icons/ellipsis-vertical";
import DropdownMenu from "../DropdownMenu";
import Logo from "../Logo";
import pb from "../../lib/pb";

// The hamburger button here only toggles the Sidebar (owned by
// MainLayout, passed in as sidebarOpen/onToggleSidebar). There is no
// separate mobile-only menu anymore.
export default function TopBar(props) {
  const handleLogout = () => {
    pb.authStore.clear();
  };

  return (
    <header class="sticky top-0 z-40 p-2  border-b border-[var(--color-border-soft)] bg-[var(--color-bg)] shadow-md">
      <div class="flex justify-between px-8">
        <div class="flex items-center gap-3">
          <button
            type="button"
            onClick={() => props.onToggleSidebar()}
            aria-label="Toggle sidebar"
            aria-expanded={props.sidebarOpen}
          >
            {props.sidebarOpen ? <X size={30} /> : <Menu size={30} />}
          </button>
          <Logo linkable />
        </div>

        <nav class="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenu.Trigger aria-label="Open menu">
              <EllipsisVertical size={24} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={handleLogout}>
                  Log out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
