import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout(props) {
  return (
    <div class="flex min-h-screen flex-col bg-[var(--color-bg)]">
      {/* Header with navbar and mobile menu */}
      <Header />

      {/* Main content area */}
      <div class="flex flex-1">
        {/* Sidebar (desktop only) */}
        <Sidebar />

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
