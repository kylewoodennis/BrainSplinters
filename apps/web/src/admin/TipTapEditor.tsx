import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { isSafeHttpUrl, type TipTapDocument, emptyTipTapDocument } from '@brainsplinters/shared';
import { useEffect } from 'react';

const EXTENSIONS = [
  StarterKit.configure({
    // Keep the node/mark set intentionally small (see PLANNING.md).
    heading: { levels: [1, 2, 3] },
  }),
  Link.configure({ openOnClick: false, autolink: false }),
  Image,
];

export function TipTapEditor({
  value,
  onChange,
}: {
  value: TipTapDocument;
  onChange: (doc: TipTapDocument) => void;
}): React.JSX.Element {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value as unknown as Record<string, unknown>,
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as unknown as TipTapDocument),
  });

  // Keep the editor in sync if `value` is replaced from outside (e.g. switching Posts).
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value ?? emptyTipTapDocument);
    if (current !== next) {
      editor.commands.setContent((value ?? emptyTipTapDocument) as unknown as Record<string, unknown>);
    }
  }, [value, editor]);

  if (!editor) return <p>Loading editor…</p>;

  function addLink() {
    const url = window.prompt('Link URL');
    if (!url) return;
    if (!isSafeHttpUrl(url)) {
      window.alert('Please enter a valid http(s) URL.');
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function addImage() {
    const url = window.prompt('Image URL');
    if (!url) return;
    if (!isSafeHttpUrl(url)) {
      window.alert('Please enter a valid http(s) URL.');
      return;
    }
    editor?.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="tiptap-editor">
      <div className="tiptap-toolbar">
        <button
          type="button"
          className={editor.isActive('bold') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={editor.isActive('italic') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <button
          type="button"
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </button>
        <button
          type="button"
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          Code
        </button>
        <button
          type="button"
          className={editor.isActive('link') ? 'is-active' : ''}
          onClick={addLink}
        >
          Link
        </button>
        <button type="button" onClick={addImage}>
          Image
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
