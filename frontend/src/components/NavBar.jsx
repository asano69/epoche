import pb from "../lib/pb";
import Logo from "./Logo";

export default function NavBar() {
  const handleLogout = () => pb.authStore.clear();

  return (
    <div class="flex w-full flex-wrap items-center justify-between ">
      <Logo linkable />
      <nav class="flex flex-wrap items-center gap-3">
        <button type="button" class="btn" onClick={handleLogout}>
          Log out
        </button>
      </nav>
    </div>
  );
}
