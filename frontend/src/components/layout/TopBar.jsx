import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Menu from "lucide-solid/icons/menu";
import X from "lucide-solid/icons/x";
import Plus from "lucide-solid/icons/plus";
import Logo from "../Logo";
import UserMenu from "./UserMenu";
import PromptDialog from "../dialogs/PromptDialog";
import { createContext } from "../../lib/contexts";

// The hamburger button here only toggles the Sidebar (owned by
// MainLayout, passed in as sidebarOpen/onToggleSidebar). There is no
// separate mobile-only menu anymore.
export default function TopBar(props) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = createSignal(false);

  // Creates a new context, then navigates straight to its (still empty)
  // notes list, matching what renaming a context already does.
  const handleCreate = async (name) => {
    const record = await createContext(name);
    navigate(`/contexts/${encodeURIComponent(record.context)}`);
  };

  return (
    <header class="sticky top-0 z-40 p-2  border-b border-border bg-nav">
      <div class="flex justify-between px-8">
        <div class="flex items-center gap-3">
          {/* Toggle button only exists on mobile; on desktop the
              sidebar is always visible so there's nothing to toggle. */}
          <Show when={props.isMobile}>
            <button
              type="button"
              onClick={() => props.onToggleSidebar()}
              aria-label="Toggle sidebar"
              aria-expanded={props.sidebarOpen}
              class="icon-btn"
            >
              {props.sidebarOpen ? <X size={30} /> : <Menu size={30} />}
            </button>
          </Show>
          <Logo showTitle linkable />
        </div>

        <nav class="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label="New context"
            class="icon-btn"
          >
            <Plus size={24} />
          </button>
          <UserMenu />
        </nav>
      </div>

      <PromptDialog
        open={createOpen()}
        onOpenChange={setCreateOpen}
        title="New context"
        label=""
        initialValue=""
        errorMessage="Failed to create the context."
        onSubmit={handleCreate}
      />
    </header>
  );
}
