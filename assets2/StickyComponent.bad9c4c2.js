import { aj as LexicalPlainTextPlugin_prod, ak as CAN_USE_DOM, r as react, al as theme$1, L as LexicalComposerContext_1, g as LexicalCollaborationContext_1, i as useSharedHistoryContext, a as jsx, j as jsxs, q as LexicalHistoryPlugin_1, t as LexicalContentEditable, P as Placeholder, v as LexicalErrorBoundary_1, b as Lexical_1, am as $isStickyNode } from "./main.29906b64.js";
import { L as LexicalCollaborationPlugin_1, c as createWebsocketProvider } from "./collaboration.c3051c8d.js";
import { L as LexicalNestedComposer_1 } from "./LexicalNestedComposer.7960692b.js";
const LexicalPlainTextPlugin = LexicalPlainTextPlugin_prod;
var LexicalPlainTextPlugin_1 = LexicalPlainTextPlugin;
const useLayoutEffectImpl = CAN_USE_DOM ? react.exports.useLayoutEffect : react.exports.useEffect;
var StickyNode = "";
var StickyEditorTheme$1 = "";
const theme = {
  ...theme$1,
  paragraph: "StickyEditorTheme__paragraph"
};
var StickyEditorTheme = theme;
function positionSticky(stickyElem, positioning) {
  const style = stickyElem.style;
  const rootElementRect = positioning.rootElementRect;
  const rectLeft = rootElementRect !== null ? rootElementRect.left : 0;
  const rectTop = rootElementRect !== null ? rootElementRect.top : 0;
  style.top = rectTop + positioning.y + "px";
  style.left = rectLeft + positioning.x + "px";
}
function StickyComponent({
  x,
  y,
  nodeKey,
  color,
  caption
}) {
  const [editor] = LexicalComposerContext_1.useLexicalComposerContext();
  const stickyContainerRef = react.exports.useRef(null);
  const positioningRef = react.exports.useRef({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    rootElementRect: null,
    x: 0,
    y: 0
  });
  const {
    isCollabActive
  } = LexicalCollaborationContext_1.useCollaborationContext();
  react.exports.useEffect(() => {
    const position = positioningRef.current;
    position.x = x;
    position.y = y;
    const stickyContainer = stickyContainerRef.current;
    if (stickyContainer !== null) {
      positionSticky(stickyContainer, position);
    }
  }, [x, y]);
  useLayoutEffectImpl(() => {
    const position = positioningRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const {
          target
        } = entry;
        position.rootElementRect = target.getBoundingClientRect();
        const stickyContainer = stickyContainerRef.current;
        if (stickyContainer !== null) {
          positionSticky(stickyContainer, position);
        }
      }
    });
    const removeRootListener = editor.registerRootListener((nextRootElem, prevRootElem) => {
      if (prevRootElem !== null) {
        resizeObserver.unobserve(prevRootElem);
      }
      if (nextRootElem !== null) {
        resizeObserver.observe(nextRootElem);
      }
    });
    const handleWindowResize = () => {
      const rootElement = editor.getRootElement();
      const stickyContainer = stickyContainerRef.current;
      if (rootElement !== null && stickyContainer !== null) {
        position.rootElementRect = rootElement.getBoundingClientRect();
        positionSticky(stickyContainer, position);
      }
    };
    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      removeRootListener();
    };
  }, [editor]);
  react.exports.useEffect(() => {
    const stickyContainer = stickyContainerRef.current;
    if (stickyContainer !== null) {
      setTimeout(() => {
        stickyContainer.style.setProperty("transition", "top 0.3s ease 0s, left 0.3s ease 0s");
      }, 500);
    }
  }, []);
  const handlePointerMove = (event) => {
    const stickyContainer = stickyContainerRef.current;
    const positioning = positioningRef.current;
    const rootElementRect = positioning.rootElementRect;
    if (stickyContainer !== null && positioning.isDragging && rootElementRect !== null) {
      positioning.x = event.pageX - positioning.offsetX - rootElementRect.left;
      positioning.y = event.pageY - positioning.offsetY - rootElementRect.top;
      positionSticky(stickyContainer, positioning);
    }
  };
  const handlePointerUp = (event) => {
    const stickyContainer = stickyContainerRef.current;
    const positioning = positioningRef.current;
    if (stickyContainer !== null) {
      positioning.isDragging = false;
      stickyContainer.classList.remove("dragging");
      editor.update(() => {
        const node = Lexical_1.$getNodeByKey(nodeKey);
        if ($isStickyNode(node)) {
          node.setPosition(positioning.x, positioning.y);
        }
      });
    }
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
  };
  const handleDelete = () => {
    editor.update(() => {
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.remove();
      }
    });
  };
  const handleColorChange = () => {
    editor.update(() => {
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.toggleColor();
      }
    });
  };
  const {
    historyState
  } = useSharedHistoryContext();
  return /* @__PURE__ */ jsx("div", {
    ref: stickyContainerRef,
    className: "sticky-note-container",
    children: /* @__PURE__ */ jsxs("div", {
      className: `sticky-note ${color}`,
      onPointerDown: (event) => {
        const stickyContainer = stickyContainerRef.current;
        if (stickyContainer == null || event.button === 2 || event.target !== stickyContainer.firstChild) {
          return;
        }
        const stickContainer = stickyContainer;
        const positioning = positioningRef.current;
        if (stickContainer !== null) {
          const {
            top,
            left
          } = stickContainer.getBoundingClientRect();
          positioning.offsetX = event.clientX - left;
          positioning.offsetY = event.clientY - top;
          positioning.isDragging = true;
          stickContainer.classList.add("dragging");
          document.addEventListener("pointermove", handlePointerMove);
          document.addEventListener("pointerup", handlePointerUp);
          event.preventDefault();
        }
      },
      children: [/* @__PURE__ */ jsx("button", {
        onClick: handleDelete,
        className: "delete",
        "aria-label": "Delete sticky note",
        title: "Delete",
        children: "X"
      }), /* @__PURE__ */ jsx("button", {
        onClick: handleColorChange,
        className: "color",
        "aria-label": "Change sticky note color",
        title: "Color",
        children: /* @__PURE__ */ jsx("i", {
          className: "bucket"
        })
      }), /* @__PURE__ */ jsxs(LexicalNestedComposer_1.LexicalNestedComposer, {
        initialEditor: caption,
        initialTheme: StickyEditorTheme,
        children: [isCollabActive ? /* @__PURE__ */ jsx(LexicalCollaborationPlugin_1.CollaborationPlugin, {
          id: caption.getKey(),
          providerFactory: createWebsocketProvider,
          shouldBootstrap: true
        }) : /* @__PURE__ */ jsx(LexicalHistoryPlugin_1.HistoryPlugin, {
          externalHistoryState: historyState
        }), /* @__PURE__ */ jsx(LexicalPlainTextPlugin_1.PlainTextPlugin, {
          contentEditable: /* @__PURE__ */ jsx(LexicalContentEditable, {
            className: "StickyNode__contentEditable"
          }),
          placeholder: /* @__PURE__ */ jsx(Placeholder, {
            className: "StickyNode__placeholder",
            children: "What's up?"
          }),
          ErrorBoundary: LexicalErrorBoundary_1
        })]
      })]
    })
  });
}
export { StickyComponent as default };
