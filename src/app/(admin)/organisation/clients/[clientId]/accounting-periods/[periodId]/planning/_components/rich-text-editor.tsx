'use client'

import * as React from 'react'
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { JSONContent } from '@tiptap/core'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  value: JSONContent
  onChange: (next: JSONContent) => void
  placeholder?: string
  readOnly?: boolean
  /** bump to force re-apply value (Reset / initial load / rollforward) */
  syncKey?: number
  debug?: boolean
}

const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }]
}

function ToolbarButton(props: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type='button'
      size='sm'
      variant={props.active ? 'default' : 'outline'}
      disabled={props.disabled}
      onMouseDown={e => {
        e.preventDefault()
        props.onClick()
      }}
      className='h-8 px-2'
    >
      {props.children}
    </Button>
  )
}

function isInList(editor: Editor) {
  return editor.isActive('listItem')
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write…',
  readOnly = false,
  syncKey = 0,
  debug = false
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Placeholder.configure({ placeholder })
    ],
    content: EMPTY_DOC,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'min-h-[260px] rounded-md border p-4'
        )
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    }
  })

  // apply value only when syncKey changes
  const lastSyncKeyRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (!editor) return
    if (lastSyncKeyRef.current === syncKey) return
    lastSyncKeyRef.current = syncKey
    editor.commands.setContent(value ?? EMPTY_DOC, { emitUpdate: false })
  }, [editor, syncKey, value])

  const ui = useEditorState({
    editor,
    selector: ctx => {
      const e = ctx.editor
      if (!e) return null

      const inList = isInList(e)

      return {
        inList,
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        h1: e.isActive('heading', { level: 1 }),
        h2: e.isActive('heading', { level: 2 }),
        h3: e.isActive('heading', { level: 3 }),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
        blockquote: e.isActive('blockquote'),
        canUndo: e.can().chain().focus().undo().run(),
        canRedo: e.can().chain().focus().redo().run(),
        debugParent: e.state.selection.$from.parent.type.name,
        debugHeadingAttrs: e.getAttributes('heading')
      }
    }
  })

  if (!editor || !ui) return null

  return (
    <div className='space-y-2'>
      {!readOnly && (
        <div className='flex flex-wrap items-center gap-2 rounded-md border p-2'>
          <ToolbarButton
            active={ui.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </ToolbarButton>

          <ToolbarButton
            active={ui.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </ToolbarButton>

          <ToolbarButton
            active={ui.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            S
          </ToolbarButton>

          <div className='bg-border mx-1 h-8 w-px' />

          <ToolbarButton
            active={ui.h1}
            disabled={ui.inList}
            onClick={() => {
              if (editor.isActive('listItem')) return
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }}
          >
            H1
          </ToolbarButton>

          <ToolbarButton
            active={ui.h2}
            disabled={ui.inList}
            onClick={() => {
              if (editor.isActive('listItem')) return
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }}
          >
            H2
          </ToolbarButton>

          <ToolbarButton
            active={ui.h3}
            disabled={ui.inList}
            onClick={() => {
              if (editor.isActive('listItem')) return
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }}
          >
            H3
          </ToolbarButton>

          <div className='bg-border mx-1 h-8 w-px' />

          <ToolbarButton
            active={ui.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </ToolbarButton>

          <ToolbarButton
            active={ui.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </ToolbarButton>

          <ToolbarButton
            active={ui.blockquote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            Quote
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            Rule
          </ToolbarButton>

          <div className='bg-border mx-1 h-8 w-px' />

          <ToolbarButton
            disabled={!ui.canUndo}
            onClick={() => editor.chain().focus().undo().run()}
          >
            Undo
          </ToolbarButton>

          <ToolbarButton
            disabled={!ui.canRedo}
            onClick={() => editor.chain().focus().redo().run()}
          >
            Redo
          </ToolbarButton>

          {debug && (
            <div className='text-muted-foreground ml-2 text-xs'>
              parent: {ui.debugParent} | heading attrs:{' '}
              {JSON.stringify(ui.debugHeadingAttrs)}
            </div>
          )}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}

// 'use client'

// import * as React from 'react'
// import { EditorContent, useEditor, type Editor } from '@tiptap/react'
// import StarterKit from '@tiptap/starter-kit'
// import Placeholder from '@tiptap/extension-placeholder'
// import type { JSONContent } from '@tiptap/core'

// import { Button } from '@/components/ui/button'
// import { cn } from '@/lib/utils'

// type Props = {
//   value: JSONContent
//   onChange: (next: JSONContent) => void
//   placeholder?: string
//   readOnly?: boolean
//   /** bump to force re-apply value (Reset / initial load / rollforward) */
//   syncKey?: number
//   /** optional: show heading attrs in toolbar for debugging */
//   debug?: boolean
// }

// function ToolbarButton(props: {
//   active?: boolean
//   disabled?: boolean
//   onClick: () => void
//   children: React.ReactNode
// }) {
//   return (
//     <Button
//       type='button'
//       size='sm'
//       variant={props.active ? 'default' : 'outline'}
//       disabled={props.disabled}
//       onMouseDown={e => {
//         // keep focus/selection in editor
//         e.preventDefault()
//         props.onClick()
//       }}
//       className='h-8 px-2'
//     >
//       {props.children}
//     </Button>
//   )
// }

// function isInList(editor: Editor) {
//   return editor.isActive('bulletList') || editor.isActive('orderedList')
// }

// export default function RichTextEditor({
//   value,
//   onChange,
//   placeholder = 'Write…',
//   readOnly = false,
//   syncKey = 0,
//   debug = false
// }: Props) {
//   const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)

//   const editor = useEditor({
//     immediatelyRender: false,
//     extensions: [
//       StarterKit.configure({
//         heading: { levels: [1, 2, 3] }
//       }),
//       Placeholder.configure({ placeholder })
//     ],
//     content: value,
//     editable: !readOnly,

//     editorProps: {
//       attributes: {
//         class: cn(
//           'prose prose-sm max-w-none focus:outline-none',
//           'min-h-[260px] rounded-md border p-4'
//         )
//       }
//     },

//     onUpdate: ({ editor }) => {
//       onChange(editor.getJSON())
//       forceUpdate()
//     },

//     // ✅ add this (covers selection changes + all state changes)
//     onTransaction: () => {
//       forceUpdate()
//     }
//   })

//   // Only re-apply content when syncKey changes (prevents selection loss)
//   const lastSyncKeyRef = React.useRef<number>(syncKey)
//   React.useEffect(() => {
//     if (!editor) return
//     if (lastSyncKeyRef.current === syncKey) return

//     lastSyncKeyRef.current = syncKey
//     editor.commands.setContent(value, { emitUpdate: false })
//     forceUpdate()
//   }, [editor, syncKey, value])

//   if (!editor) return null

//   const inList = isInList(editor)

//   return (
//     <div className='space-y-2'>
//       {!readOnly && (
//         <div className='flex flex-wrap items-center gap-2 rounded-md border p-2'>
//           <ToolbarButton
//             active={editor.isActive('bold')}
//             onClick={() => editor.chain().focus().toggleBold().run()}
//           >
//             B
//           </ToolbarButton>

//           <ToolbarButton
//             active={editor.isActive('italic')}
//             onClick={() => editor.chain().focus().toggleItalic().run()}
//           >
//             I
//           </ToolbarButton>

//           <ToolbarButton
//             active={editor.isActive('strike')}
//             onClick={() => editor.chain().focus().toggleStrike().run()}
//           >
//             S
//           </ToolbarButton>

//           <div className='bg-border mx-1 h-8 w-px' />

//           <ToolbarButton
//             active={editor.isActive('heading', { level: 1 })}
//             disabled={inList}
//             onClick={() =>
//               editor.chain().focus().toggleHeading({ level: 1 }).run()
//             }
//           >
//             H1
//           </ToolbarButton>

//           <ToolbarButton
//             active={editor.isActive('heading', { level: 2 })}
//             disabled={inList}
//             onClick={() =>
//               editor.chain().focus().toggleHeading({ level: 2 }).run()
//             }
//           >
//             H2
//           </ToolbarButton>

//           <ToolbarButton
//             active={editor.isActive('heading', { level: 3 })}
//             disabled={inList}
//             onClick={() =>
//               editor.chain().focus().toggleHeading({ level: 3 }).run()
//             }
//           >
//             H3
//           </ToolbarButton>

//           <div className='bg-border mx-1 h-8 w-px' />

//           <ToolbarButton
//             active={editor.isActive('bulletList')}
//             onClick={() => editor.chain().focus().toggleBulletList().run()}
//           >
//             • List
//           </ToolbarButton>

//           <ToolbarButton
//             active={editor.isActive('orderedList')}
//             onClick={() => editor.chain().focus().toggleOrderedList().run()}
//           >
//             1. List
//           </ToolbarButton>

//           <ToolbarButton
//             active={editor.isActive('blockquote')}
//             onClick={() => editor.chain().focus().toggleBlockquote().run()}
//           >
//             Quote
//           </ToolbarButton>

//           <ToolbarButton
//             onClick={() => editor.chain().focus().setHorizontalRule().run()}
//           >
//             Rule
//           </ToolbarButton>

//           <div className='bg-border mx-1 h-8 w-px' />

//           <ToolbarButton
//             disabled={!editor.can().chain().focus().undo().run()}
//             onClick={() => editor.chain().focus().undo().run()}
//           >
//             Undo
//           </ToolbarButton>

//           <ToolbarButton
//             disabled={!editor.can().chain().focus().redo().run()}
//             onClick={() => editor.chain().focus().redo().run()}
//           >
//             Redo
//           </ToolbarButton>

//           {debug && (
//             <div className='text-muted-foreground ml-2 text-xs'>
//               heading attrs: {JSON.stringify(editor.getAttributes('heading'))}
//             </div>
//           )}
//         </div>
//       )}

//       <EditorContent editor={editor} />
//     </div>
//   )
// }
