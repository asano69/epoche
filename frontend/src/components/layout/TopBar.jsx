import Menu from "lucide-solid/icons/menu";
import X from "lucide-solid/icons/x";
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
    <header class="sticky top-0 z-40 border-b border-[var(--color-border-soft)] bg-[var(--color-bg)] shadow-sm">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <button
            type="button"
            onClick={props.onToggleSidebar}
            aria-label="Toggle sidebar"
            aria-expanded={props.sidebarOpen}
          >
            {props.sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Logo linkable />
        </div>

        <nav class="flex items-center gap-4">
          <button type="button" class="btn" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
