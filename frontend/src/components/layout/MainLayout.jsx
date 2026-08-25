import { createSignal } from "solid-js";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default function MainLayout(props) {
  // Sidebar open/closed state lives here so both Header (the toggle
  // button) and Sidebar (what actually shows/hides) can share it.
  const [sidebarOpen, setSidebarOpen] = createSignal(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    // h-screen + overflow-hidden bounds this to the viewport height, so
    // Sidebar and <main> below can each scroll independently instead of
    // the whole page scrolling as one.
    <div class="flex h-screen flex-col overflow-hidden bg-bg">
      {/* TopBar with logo and sidebar toggle */}
      <TopBar sidebarOpen={sidebarOpen()} onToggleSidebar={toggleSidebar} />

      {/* Main content area. min-h-0 lets its flex children (Sidebar,
          <main>) shrink to this row's height instead of growing to fit
          their content, which is what makes their own overflow-y-auto
          actually scroll instead of pushing the whole page. */}
      <div class="flex min-h-0 flex-1">
        <Sidebar open={sidebarOpen()} />

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
