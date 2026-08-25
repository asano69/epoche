import {
  createSignal,
  onCleanup,
  Show,
  createResource,
  createEffect,
  For,
} from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { Button } from "@kobalte/core/button";
import { Combobox } from "@kobalte/core/combobox";
import ChevronDown from "lucide-solid/icons/chevron-down";
import Undo2 from "lucide-solid/icons/undo-2";
import Redo2 from "lucide-solid/icons/redo-2";
import Bold from "lucide-solid/icons/bold";
import Italic from "lucide-solid/icons/italic";
import UnderlineIcon from "lucide-solid/icons/underline";
import Strikethrough from "lucide-solid/icons/strikethrough";
import CodeIcon from "lucide-solid/icons/code";
import Heading2 from "lucide-solid/icons/heading-2";
import Quote from "lucide-solid/icons/quote";
import List from "lucide-solid/icons/list";
import ListOrdered from "lucide-solid/icons/list-ordered";
import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";
import { defineBasicExtension } from "prosekit/basic";
import { createEditor } from "prosekit/core";
import { ProseKit, useEditorDerivedValue } from "prosekit/solid";

import pb from "../../lib/pb";
import Loading from "../../components/Loading";

// Note editor page, used both to create a new note ("/notes/new") and to
// edit an existing one ("/notes/:id"). The editor's content is stored as
// a ProseMirror JSON document (Editor#getDocJSON()) in the note's json
// field, so no HTML conversion is needed on save or load.
export default function Editor() {
  const params = useParams();
  // "context" is set when arriving from a context page's new-note
  // button (see routes/contexts/Notes.jsx), so the combobox below can
  // be pre-filled with that context.
  const [searchParams] = useSearchParams();
  // Only fetches when params.id is set, i.e. when editing an existing
  // note; createResource simply never runs the fetcher for "/notes/new".
  const [note] = createResource(
    () => params.id,
    (id) => pb.collection("notes").getOne(id),
  );

  return (
    <Show when={!params.id || note()} fallback={<Loading />}>
      <NoteForm
        id={params.id}
        initialContent={note()?.note}
        initialContextId={note()?.context}
        initialContextName={searchParams.context}
      />
    </Show>
  );
}

// Toolbar buttons, grouped by function (history / marks / block type /
// lists) and each backed by a ProseKit command. Kept as plain data so
// adding, removing, or reordering a formatting option is a one-line
// change instead of touching the render logic below.
const TOOLBAR_GROUPS = [
  [
    { key: "undo", label: "Undo", icon: Undo2 },
    { key: "redo", label: "Redo", icon: Redo2 },
  ],
  [
    { key: "bold", label: "Bold", icon: Bold },
    { key: "italic", label: "Italic", icon: Italic },
    { key: "underline", label: "Underline", icon: UnderlineIcon },
    { key: "strike", label: "Strikethrough", icon: Strikethrough },
    { key: "code", label: "Inline code", icon: CodeIcon },
  ],
  [
    { key: "heading", label: "Heading", icon: Heading2 },
    { key: "blockquote", label: "Quote", icon: Quote },
  ],
  [
    { key: "bulletList", label: "Bullet list", icon: List },
    { key: "orderedList", label: "Numbered list", icon: ListOrdered },
  ],
];

// Derives { isActive, canExec, command } for every toolbar button from
// the current editor state. Passed to useEditorDerivedValue, which
// re-runs it on every ProseMirror transaction.
function getToolbarItems(editor) {
  return {
    undo: {
      isActive: false,
      canExec: editor.commands.undo.canExec(),
      command: () => editor.commands.undo(),
    },
    redo: {
      isActive: false,
      canExec: editor.commands.redo.canExec(),
      command: () => editor.commands.redo(),
    },
    bold: {
      isActive: editor.marks.bold.isActive(),
      canExec: editor.commands.toggleBold.canExec(),
      command: () => editor.commands.toggleBold(),
    },
    italic: {
      isActive: editor.marks.italic.isActive(),
      canExec: editor.commands.toggleItalic.canExec(),
      command: () => editor.commands.toggleItalic(),
    },
    underline: {
      isActive: editor.marks.underline.isActive(),
      canExec: editor.commands.toggleUnderline.canExec(),
      command: () => editor.commands.toggleUnderline(),
    },
    strike: {
      isActive: editor.marks.strike.isActive(),
      canExec: editor.commands.toggleStrike.canExec(),
      command: () => editor.commands.toggleStrike(),
    },
    code: {
      isActive: editor.marks.code.isActive(),
      canExec: editor.commands.toggleCode.canExec(),
      command: () => editor.commands.toggleCode(),
    },
    heading: {
      isActive: editor.nodes.heading.isActive({ level: 2 }),
      canExec: editor.commands.toggleHeading.canExec({ level: 2 }),
      command: () => editor.commands.toggleHeading({ level: 2 }),
    },
    blockquote: {
      isActive: editor.nodes.blockquote.isActive(),
      canExec: editor.commands.toggleBlockquote.canExec(),
      command: () => editor.commands.toggleBlockquote(),
    },
    bulletList: {
      isActive: editor.nodes.list.isActive({ kind: "bullet" }),
      canExec: editor.commands.toggleList.canExec({ kind: "bullet" }),
      command: () => editor.commands.toggleList({ kind: "bullet" }),
    },
    orderedList: {
      isActive: editor.nodes.list.isActive({ kind: "ordered" }),
      canExec: editor.commands.toggleList.canExec({ kind: "ordered" }),
      command: () => editor.commands.toggleList({ kind: "ordered" }),
    },
  };
}

// Must render inside <ProseKit editor={...}>, since useEditorDerivedValue
// reads the current editor from that context.
function Toolbar() {
  const items = useEditorDerivedValue(getToolbarItems);

  return (
    <div class="notes-toolbar">
      <For each={TOOLBAR_GROUPS}>
        {(group, groupIndex) => (
          <>
            {/* No divider before the first group. */}
            <Show when={groupIndex() > 0}>
              <div class="notes-toolbar-divider" />
            </Show>
            <div class="notes-toolbar-group">
              <For each={group}>
                {({ key, label, icon: Icon }) => (
                  <Show when={items()[key]}>
                    {(item) => (
                      <button
                        type="button"
                        title={label}
                        aria-label={label}
                        disabled={!item().canExec}
                        onClick={item().command}
                        classList={{ "is-active": item().isActive }}
                      >
                        <Icon size={17} />
                      </button>
                    )}
                  </Show>
                )}
              </For>
            </div>
          </>
        )}
      </For>
    </div>
  );
}

// Split out from Editor so a fresh ProseKit editor is created every time
// the form is (re)inserted, e.g. once an existing note's data has
// finished loading.
function NoteForm(props) {
  const navigate = useNavigate();

  // Full candidate list, fetched once; the combobox below narrows this
  // down as the user types (see handleContextInputChange).
  const [allContexts] = createResource(() =>
    pb.collection("contexts").getFullList({ sort: "context" }),
  );
  const [contextOptions, setContextOptions] = createSignal([]);
  const [selectedContext, setSelectedContext] = createSignal(null);

  // Once contexts have loaded, populate the dropdown and preselect a
  // context: by id when editing an existing note, or by name when
  // arriving from a context page's new-note button.
  createEffect(() => {
    const list = allContexts();
    if (!list) return;
    const options = list.map((c) => ({ value: c.id, label: c.context }));
    setContextOptions(options);
    if (props.initialContextId) {
      const match = options.find((o) => o.value === props.initialContextId);
      if (match) setSelectedContext(match);
    } else if (props.initialContextName) {
      const match = options.find((o) => o.label === props.initialContextName);
      if (match) setSelectedContext(match);
    }
  });

  // Narrows the dropdown to contexts whose label contains the typed text.
  const handleContextInputChange = (value) => {
    const list = allContexts() ?? [];
    setContextOptions(
      list
        .filter((c) => c.context.toLowerCase().includes(value.toLowerCase()))
        .map((c) => ({ value: c.id, label: c.context })),
    );
  };

  const editor = createEditor({
    extension: defineBasicExtension(),
    defaultContent: props.initialContent,
  });

  // Solid doesn't auto-unmount ref callbacks the way React's new
  // ref-cleanup convention does, so the returned unmount function is
  // wired to onCleanup explicitly here.
  const mountEditor = (el) => {
    const unmount = editor.mount(el);
    onCleanup(() => unmount?.());
  };

  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = {
        note: editor.getDocJSON(),
        context: selectedContext()?.value ?? "",
      };
      if (props.id) {
        await pb.collection("notes").update(props.id, data);
      } else {
        const record = await pb.collection("notes").create(data);
        // Switch to the new note's edit URL so further saves update it
        // instead of creating duplicates.
        navigate(`/notes/${record.id}`);
        return;
      }
    } catch {
      setError("Failed to save the note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} class="flex w-full flex-col gap-4">
      <Combobox
        options={contextOptions()}
        optionValue="value"
        optionLabel="label"
        optionTextValue="label"
        value={selectedContext()}
        onChange={setSelectedContext}
        onInputChange={handleContextInputChange}
        placeholder="Context (optional)"
        itemComponent={(itemProps) => (
          <Combobox.Item
            item={itemProps.item}
            class="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-hover-bg"
          >
            <Combobox.ItemLabel>
              {itemProps.item.rawValue.label}
            </Combobox.ItemLabel>
          </Combobox.Item>
        )}
      >
        <Combobox.Control
          aria-label="Context"
          class="flex w-[200px] items-center gap-2 rounded-md border border-border bg-field px-3 py-2"
        >
          <Combobox.Input class="w-0 flex-1 bg-transparent text-text outline-none" />
          <Combobox.Trigger class="-m-2 flex cursor-pointer items-center p-2 text-text">
            <Combobox.Icon>
              <ChevronDown size={16} />
            </Combobox.Icon>
          </Combobox.Trigger>
        </Combobox.Control>
        <Combobox.Portal>
          <Combobox.Content class="z-50 rounded-md border border-border bg-card p-1 shadow-popover">
            <Combobox.Listbox />
          </Combobox.Content>
        </Combobox.Portal>
      </Combobox>
      <ProseKit editor={editor}>
        <div class="notes-editor">
          <Toolbar />
          <div ref={mountEditor} class="ProseMirror notes-editor-content" />
        </div>
      </ProseKit>
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
      <Button type="submit" class="btn" disabled={saving()}>
        {saving() ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
