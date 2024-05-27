import { a9 as useModal, r as react, u as useLexicalNodeSelection_1, L as LexicalComposerContext_1, b as Lexical_1, aa as $isInlineImageNode, c as LexicalUtils_1, j as jsxs, F as Fragment, a as jsx, l as LexicalAutoFocusPlugin_1, m as LinkPlugin, ab as FloatingLinkEditorPlugin, ac as FloatingTextFormatToolbarPlugin, s as LexicalRichTextPlugin_1, t as LexicalContentEditable, P as Placeholder, v as LexicalErrorBoundary_1, ad as TextInput, ae as Select, af as DialogActions, B as Button } from "./main.29906b64.js";
import { L as LexicalNestedComposer_1 } from "./LexicalNestedComposer.7960692b.js";
var InlineImageNode = "";
const imageCache = /* @__PURE__ */ new Set();
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
  position
}) {
  useSuspenseImage(src);
  return /* @__PURE__ */ jsx("img", {
    className: className || void 0,
    src,
    alt: altText,
    ref: imageRef,
    "data-position": position,
    style: {
      display: "block",
      height,
      width
    },
    draggable: "false"
  });
}
function UpdateInlineImageDialog({
  activeEditor,
  nodeKey,
  onClose
}) {
  const editorState = activeEditor.getEditorState();
  const node = editorState.read(() => Lexical_1.$getNodeByKey(nodeKey));
  const [altText, setAltText] = react.exports.useState(node.getAltText());
  const [showCaption, setShowCaption] = react.exports.useState(node.getShowCaption());
  const [position, setPosition] = react.exports.useState(node.getPosition());
  const handleShowCaptionChange = (e) => {
    setShowCaption(e.target.checked);
  };
  const handlePositionChange = (e) => {
    setPosition(e.target.value);
  };
  const handleOnConfirm = () => {
    const payload = {
      altText,
      position,
      showCaption
    };
    if (node) {
      activeEditor.update(() => {
        node.update(payload);
      });
    }
    onClose();
  };
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx("div", {
      style: {
        marginBottom: "1em"
      },
      children: /* @__PURE__ */ jsx(TextInput, {
        label: "Alt Text",
        placeholder: "Descriptive alternative text",
        onChange: setAltText,
        value: altText,
        "data-test-id": "image-modal-alt-text-input"
      })
    }), /* @__PURE__ */ jsxs(Select, {
      style: {
        marginBottom: "1em",
        width: "208px"
      },
      value: position,
      label: "Position",
      name: "position",
      id: "position-select",
      onChange: handlePositionChange,
      children: [/* @__PURE__ */ jsx("option", {
        value: "left",
        children: "Left"
      }), /* @__PURE__ */ jsx("option", {
        value: "right",
        children: "Right"
      }), /* @__PURE__ */ jsx("option", {
        value: "full",
        children: "Full Width"
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: "Input__wrapper",
      children: [/* @__PURE__ */ jsx("input", {
        id: "caption",
        type: "checkbox",
        checked: showCaption,
        onChange: handleShowCaptionChange
      }), /* @__PURE__ */ jsx("label", {
        htmlFor: "caption",
        children: "Show Caption"
      })]
    }), /* @__PURE__ */ jsx(DialogActions, {
      children: /* @__PURE__ */ jsx(Button, {
        "data-test-id": "image-modal-file-upload-btn",
        onClick: () => handleOnConfirm(),
        children: "Confirm"
      })
    })]
  });
}
function InlineImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  showCaption,
  caption,
  position
}) {
  const [modal, showModal] = useModal();
  const imageRef = react.exports.useRef(null);
  const buttonRef = react.exports.useRef(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection_1.useLexicalNodeSelection(nodeKey);
  const [editor] = LexicalComposerContext_1.useLexicalComposerContext();
  const [selection, setSelection] = react.exports.useState(null);
  const activeEditorRef = react.exports.useRef(null);
  const onDelete = react.exports.useCallback((payload) => {
    if (isSelected && Lexical_1.$isNodeSelection(Lexical_1.$getSelection())) {
      const event = payload;
      event.preventDefault();
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isInlineImageNode(node)) {
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
  react.exports.useEffect(() => {
    let isMounted = true;
    const unregister = LexicalUtils_1.mergeRegister(editor.registerUpdateListener(({
      editorState
    }) => {
      if (isMounted) {
        setSelection(editorState.read(() => Lexical_1.$getSelection()));
      }
    }), editor.registerCommand(Lexical_1.SELECTION_CHANGE_COMMAND, (_, activeEditor) => {
      activeEditorRef.current = activeEditor;
      return false;
    }, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.CLICK_COMMAND, (payload) => {
      const event = payload;
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
    }, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.DRAGSTART_COMMAND, (event) => {
      if (event.target === imageRef.current) {
        event.preventDefault();
        return true;
      }
      return false;
    }, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_DELETE_COMMAND, onDelete, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_BACKSPACE_COMMAND, onDelete, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_ENTER_COMMAND, onEnter, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_ESCAPE_COMMAND, onEscape, Lexical_1.COMMAND_PRIORITY_LOW));
    return () => {
      isMounted = false;
      unregister();
    };
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, onEnter, onEscape, setSelected]);
  const draggable = isSelected && Lexical_1.$isNodeSelection(selection);
  const isFocused = isSelected;
  return /* @__PURE__ */ jsxs(react.exports.Suspense, {
    fallback: null,
    children: [/* @__PURE__ */ jsxs(Fragment, {
      children: [/* @__PURE__ */ jsxs("div", {
        draggable,
        children: [/* @__PURE__ */ jsx("button", {
          className: "image-edit-button",
          ref: buttonRef,
          onClick: () => {
            showModal("Update Inline Image", (onClose) => /* @__PURE__ */ jsx(UpdateInlineImageDialog, {
              activeEditor: editor,
              nodeKey,
              onClose
            }));
          },
          children: "Edit"
        }), /* @__PURE__ */ jsx(LazyImage, {
          className: isFocused ? `focused ${Lexical_1.$isNodeSelection(selection) ? "draggable" : ""}` : null,
          src,
          altText,
          imageRef,
          width,
          height,
          position
        })]
      }), showCaption && /* @__PURE__ */ jsx("div", {
        className: "image-caption-container",
        children: /* @__PURE__ */ jsxs(LexicalNestedComposer_1.LexicalNestedComposer, {
          initialEditor: caption,
          children: [/* @__PURE__ */ jsx(LexicalAutoFocusPlugin_1.AutoFocusPlugin, {}), /* @__PURE__ */ jsx(LinkPlugin, {}), /* @__PURE__ */ jsx(FloatingLinkEditorPlugin, {
            isLinkEditMode: false,
            setIsLinkEditMode: () => {
            }
          }), /* @__PURE__ */ jsx(FloatingTextFormatToolbarPlugin, {}), /* @__PURE__ */ jsx(LexicalRichTextPlugin_1.RichTextPlugin, {
            contentEditable: /* @__PURE__ */ jsx(LexicalContentEditable, {
              className: "InlineImageNode__contentEditable"
            }),
            placeholder: /* @__PURE__ */ jsx(Placeholder, {
              className: "InlineImageNode__placeholder",
              children: "Enter a caption..."
            }),
            ErrorBoundary: LexicalErrorBoundary_1
          })]
        })
      })]
    }), modal]
  });
}
export { UpdateInlineImageDialog, InlineImageComponent as default };
