import { r as react, j as jsxs, a as jsx, L as LexicalComposerContext_1, b as Lexical_1, $ as $isEquationNode, c as LexicalUtils_1, F as Fragment, E as ErrorBoundary, K as KatexRenderer } from "./main.29906b64.js";
var EquationEditor$2 = "";
function EquationEditor({
  equation,
  setEquation,
  inline
}, forwardedRef) {
  const onChange = (event) => {
    setEquation(event.target.value);
  };
  return inline && forwardedRef instanceof HTMLInputElement ? /* @__PURE__ */ jsxs("span", {
    className: "EquationEditor_inputBackground",
    children: [/* @__PURE__ */ jsx("span", {
      className: "EquationEditor_dollarSign",
      children: "$"
    }), /* @__PURE__ */ jsx("input", {
      className: "EquationEditor_inlineEditor",
      value: equation,
      onChange,
      autoFocus: true,
      ref: forwardedRef
    }), /* @__PURE__ */ jsx("span", {
      className: "EquationEditor_dollarSign",
      children: "$"
    })]
  }) : /* @__PURE__ */ jsxs("div", {
    className: "EquationEditor_inputBackground",
    children: [/* @__PURE__ */ jsx("span", {
      className: "EquationEditor_dollarSign",
      children: "$$\n"
    }), /* @__PURE__ */ jsx("textarea", {
      className: "EquationEditor_blockEditor",
      value: equation,
      onChange,
      ref: forwardedRef
    }), /* @__PURE__ */ jsx("span", {
      className: "EquationEditor_dollarSign",
      children: "\n$$"
    })]
  });
}
var EquationEditor$1 = /* @__PURE__ */ react.exports.forwardRef(EquationEditor);
function EquationComponent({
  equation,
  inline,
  nodeKey
}) {
  const [editor] = LexicalComposerContext_1.useLexicalComposerContext();
  const [equationValue, setEquationValue] = react.exports.useState(equation);
  const [showEquationEditor, setShowEquationEditor] = react.exports.useState(false);
  const inputRef = react.exports.useRef(null);
  const onHide = react.exports.useCallback((restoreSelection) => {
    setShowEquationEditor(false);
    editor.update(() => {
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isEquationNode(node)) {
        node.setEquation(equationValue);
        if (restoreSelection) {
          node.selectNext(0, 0);
        }
      }
    });
  }, [editor, equationValue, nodeKey]);
  react.exports.useEffect(() => {
    if (!showEquationEditor && equationValue !== equation) {
      setEquationValue(equation);
    }
  }, [showEquationEditor, equation, equationValue]);
  react.exports.useEffect(() => {
    if (showEquationEditor) {
      return LexicalUtils_1.mergeRegister(editor.registerCommand(Lexical_1.SELECTION_CHANGE_COMMAND, (payload) => {
        const activeElement = document.activeElement;
        const inputElem = inputRef.current;
        if (inputElem !== activeElement) {
          onHide();
        }
        return false;
      }, Lexical_1.COMMAND_PRIORITY_HIGH), editor.registerCommand(Lexical_1.KEY_ESCAPE_COMMAND, (payload) => {
        const activeElement = document.activeElement;
        const inputElem = inputRef.current;
        if (inputElem === activeElement) {
          onHide(true);
          return true;
        }
        return false;
      }, Lexical_1.COMMAND_PRIORITY_HIGH));
    } else {
      return editor.registerUpdateListener(({
        editorState
      }) => {
        const isSelected = editorState.read(() => {
          const selection = Lexical_1.$getSelection();
          return Lexical_1.$isNodeSelection(selection) && selection.has(nodeKey) && selection.getNodes().length === 1;
        });
        if (isSelected) {
          setShowEquationEditor(true);
        }
      });
    }
  }, [editor, nodeKey, onHide, showEquationEditor]);
  return /* @__PURE__ */ jsx(Fragment, {
    children: showEquationEditor ? /* @__PURE__ */ jsx(EquationEditor$1, {
      equation: equationValue,
      setEquation: setEquationValue,
      inline,
      ref: inputRef
    }) : /* @__PURE__ */ jsx(ErrorBoundary, {
      onError: (e) => editor._onError(e),
      fallback: null,
      children: /* @__PURE__ */ jsx(KatexRenderer, {
        equation: equationValue,
        inline,
        onDoubleClick: () => setShowEquationEditor(true)
      })
    })
  });
}
export { EquationComponent as default };
