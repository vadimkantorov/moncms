import { r as react, u as useLexicalNodeSelection_1, g as LexicalCollaborationContext_1, L as LexicalComposerContext_1, b as Lexical_1, h as $isImageNode, c as LexicalUtils_1, i as useSharedHistoryContext, k as useSettings, a as jsx, j as jsxs, F as Fragment, l as LexicalAutoFocusPlugin_1, N as NewMentionsPlugin, m as LinkPlugin, n as EmojisPlugin, o as LexicalHashtagPlugin_1, p as KeywordsPlugin, q as LexicalHistoryPlugin_1, s as LexicalRichTextPlugin_1, t as LexicalContentEditable, P as Placeholder, v as LexicalErrorBoundary_1, T as TreeViewPlugin } from "./main.29906b64.js";
import { L as LexicalCollaborationPlugin_1, c as createWebsocketProvider } from "./collaboration.c3051c8d.js";
import { L as LexicalNestedComposer_1 } from "./LexicalNestedComposer.7960692b.js";
import { I as ImageResizer } from "./ImageResizer.c2987cf7.js";
var ImageNode = "";
const imageCache = /* @__PURE__ */ new Set();
const RIGHT_CLICK_IMAGE_COMMAND = Lexical_1.createCommand("RIGHT_CLICK_IMAGE_COMMAND");
function useSuspenseImage(src) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.add(src);
        resolve(null);
      };
    });
  }
}
function LazyImage({
  altText,
  className,
  imageRef,
  src,
  width,
  height,
  maxWidth
}) {
  useSuspenseImage(src);
  return /* @__PURE__ */ jsx("img", {
    className: className || void 0,
    src,
    alt: altText,
    ref: imageRef,
    style: {
      height,
      maxWidth,
      width
    },
    draggable: "false"
  });
}
function ImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  maxWidth,
  resizable,
  showCaption,
  caption,
  captionsEnabled
}) {
  const imageRef = react.exports.useRef(null);
  const buttonRef = react.exports.useRef(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection_1.useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = react.exports.useState(false);
  const {
    isCollabActive
  } = LexicalCollaborationContext_1.useCollaborationContext();
  const [editor] = LexicalComposerContext_1.useLexicalComposerContext();
  const [selection, setSelection] = react.exports.useState(null);
  const activeEditorRef = react.exports.useRef(null);
  const onDelete = react.exports.useCallback((payload) => {
    if (isSelected && Lexical_1.$isNodeSelection(Lexical_1.$getSelection())) {
      const event = payload;
      event.preventDefault();
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.remove();
      }
    }
    return false;
  }, [isSelected, nodeKey]);
  const onEnter = react.exports.useCallback((event) => {
    const latestSelection = Lexical_1.$getSelection();
    const buttonElem = buttonRef.current;
    if (isSelected && Lexical_1.$isNodeSelection(latestSelection) && latestSelection.getNodes().length === 1) {
      if (showCaption) {
        Lexical_1.$setSelection(null);
        event.preventDefault();
        caption.focus();
        return true;
      } else if (buttonElem !== null && buttonElem !== document.activeElement) {
        event.preventDefault();
        buttonElem.focus();
        return true;
      }
    }
    return false;
  }, [caption, isSelected, showCaption]);
  const onEscape = react.exports.useCallback((event) => {
    if (activeEditorRef.current === caption || buttonRef.current === event.target) {
      Lexical_1.$setSelection(null);
      editor.update(() => {
        setSelected(true);
        const parentRootElement = editor.getRootElement();
        if (parentRootElement !== null) {
          parentRootElement.focus();
        }
      });
      return true;
    }
    return false;
  }, [caption, editor, setSelected]);
  const onClick = react.exports.useCallback((payload) => {
    const event = payload;
    if (isResizing) {
      return true;
    }
    if (event.target === imageRef.current) {
      if (event.shiftKey) {
        setSelected(!isSelected);
      } else {
        clearSelection();
        setSelected(true);
      }
      return true;
    }
    return false;
  }, [isResizing, isSelected, setSelected, clearSelection]);
  const onRightClick = react.exports.useCallback((event) => {
    editor.getEditorState().read(() => {
      const latestSelection = Lexical_1.$getSelection();
      const domElement = event.target;
      if (domElement.tagName === "IMG" && Lexical_1.$isRangeSelection(latestSelection) && latestSelection.getNodes().length === 1) {
        editor.dispatchCommand(RIGHT_CLICK_IMAGE_COMMAND, event);
      }
    });
  }, [editor]);
  react.exports.useEffect(() => {
    let isMounted = true;
    const rootElement = editor.getRootElement();
    const unregister = LexicalUtils_1.mergeRegister(editor.registerUpdateListener(({
      editorState
    }) => {
      if (isMounted) {
        setSelection(editorState.read(() => Lexical_1.$getSelection()));
      }
    }), editor.registerCommand(Lexical_1.SELECTION_CHANGE_COMMAND, (_, activeEditor) => {
      activeEditorRef.current = activeEditor;
      return false;
    }, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.CLICK_COMMAND, onClick, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(RIGHT_CLICK_IMAGE_COMMAND, onClick, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.DRAGSTART_COMMAND, (event) => {
      if (event.target === imageRef.current) {
        event.preventDefault();
        return true;
      }
      return false;
    }, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_DELETE_COMMAND, onDelete, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_BACKSPACE_COMMAND, onDelete, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_ENTER_COMMAND, onEnter, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_ESCAPE_COMMAND, onEscape, Lexical_1.COMMAND_PRIORITY_LOW));
    rootElement == null ? void 0 : rootElement.addEventListener("contextmenu", onRightClick);
    return () => {
      isMounted = false;
      unregister();
      rootElement == null ? void 0 : rootElement.removeEventListener("contextmenu", onRightClick);
    };
  }, [clearSelection, editor, isResizing, isSelected, nodeKey, onDelete, onEnter, onEscape, onClick, onRightClick, setSelected]);
  const setShowCaption = () => {
    editor.update(() => {
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setShowCaption(true);
      }
    });
  };
  const onResizeEnd = (nextWidth, nextHeight) => {
    setTimeout(() => {
      setIsResizing(false);
    }, 200);
    editor.update(() => {
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setWidthAndHeight(nextWidth, nextHeight);
      }
    });
  };
  const onResizeStart = () => {
    setIsResizing(true);
  };
  const {
    historyState
  } = useSharedHistoryContext();
  const {
    settings: {
      showNestedEditorTreeView
    }
  } = useSettings();
  const draggable = isSelected && Lexical_1.$isNodeSelection(selection) && !isResizing;
  const isFocused = isSelected || isResizing;
  return /* @__PURE__ */ jsx(react.exports.Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsxs(Fragment, {
      children: [/* @__PURE__ */ jsx("div", {
        draggable,
        children: /* @__PURE__ */ jsx(LazyImage, {
          className: isFocused ? `focused ${Lexical_1.$isNodeSelection(selection) ? "draggable" : ""}` : null,
          src,
          altText,
          imageRef,
          width,
          height,
          maxWidth
        })
      }), showCaption && /* @__PURE__ */ jsx("div", {
        className: "image-caption-container",
        children: /* @__PURE__ */ jsxs(LexicalNestedComposer_1.LexicalNestedComposer, {
          initialEditor: caption,
          children: [/* @__PURE__ */ jsx(LexicalAutoFocusPlugin_1.AutoFocusPlugin, {}), /* @__PURE__ */ jsx(NewMentionsPlugin, {}), /* @__PURE__ */ jsx(LinkPlugin, {}), /* @__PURE__ */ jsx(EmojisPlugin, {}), /* @__PURE__ */ jsx(LexicalHashtagPlugin_1.HashtagPlugin, {}), /* @__PURE__ */ jsx(KeywordsPlugin, {}), isCollabActive ? /* @__PURE__ */ jsx(LexicalCollaborationPlugin_1.CollaborationPlugin, {
            id: caption.getKey(),
            providerFactory: createWebsocketProvider,
            shouldBootstrap: true
          }) : /* @__PURE__ */ jsx(LexicalHistoryPlugin_1.HistoryPlugin, {
            externalHistoryState: historyState
          }), /* @__PURE__ */ jsx(LexicalRichTextPlugin_1.RichTextPlugin, {
            contentEditable: /* @__PURE__ */ jsx(LexicalContentEditable, {
              className: "ImageNode__contentEditable"
            }),
            placeholder: /* @__PURE__ */ jsx(Placeholder, {
              className: "ImageNode__placeholder",
              children: "Enter a caption..."
            }),
            ErrorBoundary: LexicalErrorBoundary_1
          }), showNestedEditorTreeView === true ? /* @__PURE__ */ jsx(TreeViewPlugin, {}) : null]
        })
      }), resizable && Lexical_1.$isNodeSelection(selection) && isFocused && /* @__PURE__ */ jsx(ImageResizer, {
        showCaption,
        setShowCaption,
        editor,
        buttonRef,
        imageRef,
        maxWidth,
        onResizeStart,
        onResizeEnd,
        captionsEnabled
      })]
    })
  });
}
export { RIGHT_CLICK_IMAGE_COMMAND, ImageComponent as default };
