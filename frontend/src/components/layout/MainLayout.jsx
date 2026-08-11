import { createSignal } from "solid-js";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default function MainLayout(props) {
  // Sidebar open/closed state lives here so both Header (the toggle
  // button) and Sidebar (what actually shows/hides) can share it.
  const [sidebarOpen, setSidebarOpen] = createSignal(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    <div class="flex min-h-screen flex-col bg-[var(--color-bg)]">
      {/* TopBar with logo and sidebar toggle */}
      <TopBar sidebarOpen={sidebarOpen()} onToggleSidebar={toggleSidebar} />

      {/* Main content area */}
      <div class="flex flex-1">
        <Sidebar open={sidebarOpen()} />

        {/* Main content */}
        <main class="flex-1 overflow-y-auto">
          <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {props.children}
          </div>
        </main>
      </div>
    </div>
  );
}
