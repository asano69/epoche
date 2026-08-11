import { createSignal } from "solid-js";
import Menu from "lucide-solid/icons/menu";
import X from "lucide-solid/icons/x"
import Logo from "../Logo";
import pb from "../../lib/pb";

export default function Header(props) {
  const [isOpen, setIsOpen] = createSignal(false);

  const handleLogout = () => {
    pb.authStore.clear();
  };

  const toggleMenu = () => setIsOpen(!isOpen());
  const closeMenu = () => setIsOpen(false);

  return (
    <header class="sticky top-0 z-40 border-b border-[var(--color-border-soft)] bg-[var(--color-bg)] shadow-sm">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Logo linkable />
        
        {/* Desktop navigation */}
        <nav class="hidden items-center gap-4 md:flex">
          <button type="button" class="btn" onClick={handleLogout}>
            Log out
          </button>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          class="md:hidden"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isOpen()}
        >
          {isOpen() ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu drawer */}
      <nav
        class="border-t border-[var(--color-border-soft)] bg-[var(--color-panel)] px-4 py-4 md:hidden transition-all duration-200 overflow-hidden"
        style={{
          "max-height": isOpen() ? "200px" : "0px",
          opacity: isOpen() ? 1 : 0,
        }}
      >
        <button
          type="button"
          class="btn w-full"
          onClick={() => {
            handleLogout();
            closeMenu();
          }}
        >
          Log out
        </button>
      </nav>
    </header>
  );
}
