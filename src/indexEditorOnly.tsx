/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {CharacterLimitPlugin} from '@lexical/react/LexicalCharacterLimitPlugin';
import {CheckListPlugin} from '@lexical/react/LexicalCheckListPlugin';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import LexicalClickableLinkPlugin from '@lexical/react/LexicalClickableLinkPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {HashtagPlugin} from '@lexical/react/LexicalHashtagPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {HorizontalRulePlugin} from '@lexical/react/LexicalHorizontalRulePlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import useLexicalEditable from '@lexical/react/useLexicalEditable';
import * as React from 'react';
import {useEffect, useState} from 'react';
import {CAN_USE_DOM} from 'shared/canUseDOM';

import {createWebsocketProvider} from './collaboration';
import {useSettings} from './context/SettingsContext';
import {useSharedHistoryContext} from './context/SharedHistoryContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CodeActionMenuPlugin from './plugins/CodeActionMenuPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import ComponentPickerPlugin from './plugins/ComponentPickerPlugin';
import ContextMenuPlugin from './plugins/ContextMenuPlugin';
import DragDropPaste from './plugins/DragDropPastePlugin';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import EquationsPlugin from './plugins/EquationsPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import InlineImagePlugin from './plugins/InlineImagePlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import {LayoutPlugin} from './plugins/LayoutPlugin/LayoutPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import MarkdownShortcutPlugin from './plugins/MarkdownShortcutPlugin';
import {MaxLengthPlugin} from './plugins/MaxLengthPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import PageBreakPlugin from './plugins/PageBreakPlugin';
import TabFocusPlugin from './plugins/TabFocusPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TableOfContentsPlugin from './plugins/TableOfContentsPlugin';
import ToolbarPlugin from './plugins/ToolbarPluginSimple';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';
import ContentEditable from './ui/ContentEditable';
import Placeholder from './ui/Placeholder';

export default function EditorOnly({
  showTreeView,
  showActions,
}: {
  showTreeView: boolean;
  showActions: boolean;
}): JSX.Element {
  const {historyState} = useSharedHistoryContext();
  const {
    settings: {
      isAutocomplete,
      isMaxLength,
      isCharLimit,
      isCharLimitUtf8,
      showTableOfContents,
      shouldUseLexicalContextMenu,
      tableCellMerge,
      tableCellBackgroundColor,
    },
  } = useSettings();
  const isEditable = useLexicalEditable();
  const placeholder = <Placeholder>Enter some rich text...</Placeholder>;
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState<boolean>(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport =
        CAN_USE_DOM && window.matchMedia('(max-width: 1025px)').matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  return (
    <>
      <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
      <div
        className={`editor-container ${showTreeView ? 'tree-view' : ''} 
        `}>
        {isMaxLength && <MaxLengthPlugin maxLength={30} />}
        <DragDropPaste />
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <ComponentPickerPlugin />
        <EmojiPickerPlugin />
        <AutoEmbedPlugin />

        <MentionsPlugin />
        <EmojisPlugin />
        <HashtagPlugin />
        <KeywordsPlugin />
        <AutoLinkPlugin />
            
        <HistoryPlugin externalHistoryState={historyState} />
        <RichTextPlugin
          contentEditable={
            <div className="editor-scroller">
              <div className="editor" ref={onRef}>
                <ContentEditable />
              </div>
            </div>
          }
          placeholder={placeholder}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <MarkdownShortcutPlugin />
        <CodeHighlightPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <ListMaxIndentLevelPlugin maxDepth={7} />
        <TablePlugin
          hasCellMerge={tableCellMerge}
          hasCellBackgroundColor={tableCellBackgroundColor}
        />
        <TableCellResizer />
        <ImagesPlugin />
        <InlineImagePlugin />
        <LinkPlugin />
        <TwitterPlugin />
        <YouTubePlugin />
        {!isEditable && <LexicalClickableLinkPlugin />}
        <HorizontalRulePlugin />
        <EquationsPlugin />
        <TabFocusPlugin />
        <TabIndentationPlugin />
        <CollapsiblePlugin />
        <PageBreakPlugin />
        <LayoutPlugin />
        {floatingAnchorElem && !isSmallWidthViewport && (
          <>
            <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
            <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
            <FloatingLinkEditorPlugin
              anchorElem={floatingAnchorElem}
              isLinkEditMode={isLinkEditMode}
              setIsLinkEditMode={setIsLinkEditMode}
            />
            <TableCellActionMenuPlugin
              anchorElem={floatingAnchorElem}
              cellMerge={true}
            />
            <FloatingTextFormatToolbarPlugin
              anchorElem={floatingAnchorElem}
            />
          </>
        )}
        
        {(isCharLimit || isCharLimitUtf8) && (
          <CharacterLimitPlugin
            charset={isCharLimit ? 'UTF-16' : 'UTF-8'}
            maxLength={5}
          />
        )}
        {isAutocomplete && <AutocompletePlugin />}
        <div>{showTableOfContents && <TableOfContentsPlugin />}</div>
        {shouldUseLexicalContextMenu && <ContextMenuPlugin />}
        {/*{showActions && <ActionsPlugin isRichText={true} />}*/}
      </div>
      {showTreeView && <TreeViewPlugin />}
    </>
  );
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './setupEnv';
import './index.css';

import { createRoot } from 'react-dom/client';
import React, { createElement, forwardRef, useRef, useImperativeHandle } from 'react';

import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import {PLAYGROUND_TRANSFORMERS} from './plugins/MarkdownTransformers';
import {FlashMessageContext} from './context/FlashMessageContext';
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { EditorSetOptions } from 'lexical/LexicalEditor';
import { EditorState, LexicalEditor, $getRoot } from 'lexical';

//import EditorOnly from './EditorOnly';
import { TableContext } from './plugins/TablePlugin';
import PlaygroundNodes from './nodes/PlaygroundNodes';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';

declare global {
    interface Window {
        LexicalMarkdownEditor: (selector: string) => void;
    }
}


// Handle runtime errors
const showErrorOverlay = (err: Event) => {
    const ErrorOverlay = customElements.get('vite-error-overlay');
    if (!ErrorOverlay) {
        return;
    }
    const overlay = new ErrorOverlay(err);
    const body = document.body;
    if (body !== null) {
        body.appendChild(overlay);
    }
};

window.addEventListener('error', showErrorOverlay);
window.addEventListener('unhandledrejection', ({ reason }) =>
    showErrorOverlay(reason),
);

interface EditorMethods {
    _getRawEditorInstance: () => LexicalEditor | null;
    getEditorState: () => EditorState | undefined;
    setEditorState: (editorState: EditorState, editorOptions?: EditorSetOptions) => void;
    setMarkdown: (markdown: string) => void;
    getMarkdown: () => Promise<string>;
}

const App = forwardRef<EditorMethods>(function App(_, ref): JSX.Element {
    const initialConfig: InitialConfigType = {
        editorState: null,
        namespace: 'Playground',
        nodes: [...PlaygroundNodes],
        onError: (error: Error) => {
            throw error
        },
        theme: PlaygroundEditorTheme,
    }

    const editorRef = useRef<LexicalEditor>(null)

    useImperativeHandle(ref, () => ({
        _getRawEditorInstance(): LexicalEditor | null {
            return editorRef.current
        },
        getEditorState(): EditorState | undefined {
            return editorRef.current?.getEditorState()
        },
        setEditorState(editorState: EditorState, editorOptions?: EditorSetOptions): void {
            editorRef.current?.setEditorState(editorState, editorOptions)
        },
        setMarkdown(markdown: string): void {
            editorRef.current?.update(() => {
                const editorState = editorRef.current?.getEditorState()
                if (editorState != null) {
                    $convertFromMarkdownString(markdown, PLAYGROUND_TRANSFORMERS)
                    $getRoot().selectStart();
                }
            })
        },
        getMarkdown(): Promise<string> {
            return new Promise(resolve => {
                editorRef.current?.update(() => {
                    const md = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS)
                    resolve(md)
                })
            })
        }
    }))


    return (
        <LexicalComposer initialConfig={initialConfig}>
<FlashMessageContext>
            <TableContext>
                <div className="editor-shell">
                    <EditorOnly showTreeView={false} showActions={true} />
                    <EditorRefPlugin editorRef={editorRef} />
                </div>
            </TableContext>
</FlashMessageContext>
        </LexicalComposer>
    )
})

function createApp(selector: string): Promise<EditorMethods | null> {
    return new Promise((resolve) => {
        const root = createRoot(document.querySelector(selector) as HTMLElement)

        const app = createElement(App, {
            ref: resolve,
        })

        root.render(app)
    })
}

window.LexicalMarkdownEditor = createApp
