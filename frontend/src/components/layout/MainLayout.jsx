import { createSignal } from "solid-js";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { createIsMobile } from "../../lib/mediaQuery";

export default function MainLayout(props) {
  // Whether the viewport is currently mobile-sized. Drives both the
  // toggle button's visibility (TopBar) and the sidebar's overlay vs.
  // always-visible behavior (Sidebar).
  const isMobile = createIsMobile();

  // Only meaningful on mobile: whether the overlay sidebar is open. On
  // desktop the sidebar is always shown regardless of this value.
  const [sidebarOpen, setSidebarOpen] = createSignal(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    // h-screen + overflow-hidden bounds this to the viewport height, so
    // Sidebar and <main> below can each scroll independently instead of
    // the whole page scrolling as one.
    <div class="flex h-screen flex-col overflow-hidden bg-bg">
      {/* TopBar with logo and sidebar toggle */}
      <TopBar
        isMobile={isMobile()}
        sidebarOpen={sidebarOpen()}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main content area. min-h-0 lets its flex children (Sidebar,
          <main>) shrink to this row's height instead of growing to fit
          their content, which is what makes their own overflow-y-auto
          actually scroll instead of pushing the whole page. relative
          gives Sidebar's mobile overlay a positioning context that
          starts below TopBar instead of covering the whole viewport. */}
      <div class="relative flex min-h-0 flex-1">
        <Sidebar
          isMobile={isMobile()}
          open={isMobile() ? sidebarOpen() : true}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main class="min-h-0 flex-1 overflow-y-auto">
          <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {props.children}
          </div>
        </main>
      </div>
    </div>
  );
}
