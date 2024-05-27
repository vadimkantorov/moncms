import { L as LexicalComposerContext_1, r as react, u as useLexicalNodeSelection_1, b as Lexical_1, ag as $isPollNode, c as LexicalUtils_1, a as jsx, j as jsxs, B as Button, g as LexicalCollaborationContext_1, ah as joinClasses, ai as createPollOption } from "./main.29906b64.js";
var PollNode = "";
function getTotalVotes(options) {
  return options.reduce((totalVotes, next) => {
    return totalVotes + next.votes.length;
  }, 0);
}
function PollOptionComponent({
  option,
  index,
  options,
  totalVotes,
  withPollNode
}) {
  const {
    clientID
  } = LexicalCollaborationContext_1.useCollaborationContext();
  const checkboxRef = react.exports.useRef(null);
  const votesArray = option.votes;
  const checkedIndex = votesArray.indexOf(clientID);
  const checked = checkedIndex !== -1;
  const votes = votesArray.length;
  const text = option.text;
  return /* @__PURE__ */ jsxs("div", {
    className: "PollNode__optionContainer",
    children: [/* @__PURE__ */ jsx("div", {
      className: joinClasses("PollNode__optionCheckboxWrapper", checked && "PollNode__optionCheckboxChecked"),
      children: /* @__PURE__ */ jsx("input", {
        ref: checkboxRef,
        className: "PollNode__optionCheckbox",
        type: "checkbox",
        onChange: (e) => {
          withPollNode((node) => {
            node.toggleVote(option, clientID);
          });
        },
        checked
      })
    }), /* @__PURE__ */ jsxs("div", {
      className: "PollNode__optionInputWrapper",
      children: [/* @__PURE__ */ jsx("div", {
        className: "PollNode__optionInputVotes",
        style: {
          width: `${votes === 0 ? 0 : votes / totalVotes * 100}%`
        }
      }), /* @__PURE__ */ jsx("span", {
        className: "PollNode__optionInputVotesCount",
        children: votes > 0 && (votes === 1 ? "1 vote" : `${votes} votes`)
      }), /* @__PURE__ */ jsx("input", {
        className: "PollNode__optionInput",
        type: "text",
        value: text,
        onChange: (e) => {
          const target = e.target;
          const value = target.value;
          const selectionStart = target.selectionStart;
          const selectionEnd = target.selectionEnd;
          withPollNode((node) => {
            node.setOptionText(option, value);
          }, () => {
            target.selectionStart = selectionStart;
            target.selectionEnd = selectionEnd;
          });
        },
        placeholder: `Option ${index + 1}`
      })]
    }), /* @__PURE__ */ jsx("button", {
      disabled: options.length < 3,
      className: joinClasses("PollNode__optionDelete", options.length < 3 && "PollNode__optionDeleteDisabled"),
      "aria-label": "Remove",
      onClick: () => {
        withPollNode((node) => {
          node.deleteOption(option);
        });
      }
    })]
  });
}
function PollComponent({
  question,
  options,
  nodeKey
}) {
  const [editor] = LexicalComposerContext_1.useLexicalComposerContext();
  const totalVotes = react.exports.useMemo(() => getTotalVotes(options), [options]);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection_1.useLexicalNodeSelection(nodeKey);
  const [selection, setSelection] = react.exports.useState(null);
  const ref = react.exports.useRef(null);
  const onDelete = react.exports.useCallback((payload) => {
    if (isSelected && Lexical_1.$isNodeSelection(Lexical_1.$getSelection())) {
      const event = payload;
      event.preventDefault();
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isPollNode(node)) {
        node.remove();
      }
    }
    return false;
  }, [isSelected, nodeKey]);
  react.exports.useEffect(() => {
    return LexicalUtils_1.mergeRegister(editor.registerUpdateListener(({
      editorState
    }) => {
      setSelection(editorState.read(() => Lexical_1.$getSelection()));
    }), editor.registerCommand(Lexical_1.CLICK_COMMAND, (payload) => {
      const event = payload;
      if (event.target === ref.current) {
        if (!event.shiftKey) {
          clearSelection();
        }
        setSelected(!isSelected);
        return true;
      }
      return false;
    }, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_DELETE_COMMAND, onDelete, Lexical_1.COMMAND_PRIORITY_LOW), editor.registerCommand(Lexical_1.KEY_BACKSPACE_COMMAND, onDelete, Lexical_1.COMMAND_PRIORITY_LOW));
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);
  const withPollNode = (cb, onUpdate) => {
    editor.update(() => {
      const node = Lexical_1.$getNodeByKey(nodeKey);
      if ($isPollNode(node)) {
        cb(node);
      }
    }, {
      onUpdate
    });
  };
  const addOption = () => {
    withPollNode((node) => {
      node.addOption(createPollOption());
    });
  };
  const isFocused = Lexical_1.$isNodeSelection(selection) && isSelected;
  return /* @__PURE__ */ jsx("div", {
    className: `PollNode__container ${isFocused ? "focused" : ""}`,
    ref,
    children: /* @__PURE__ */ jsxs("div", {
      className: "PollNode__inner",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "PollNode__heading",
        children: question
      }), options.map((option, index) => {
        const key = option.uid;
        return /* @__PURE__ */ jsx(PollOptionComponent, {
          withPollNode,
          option,
          index,
          options,
          totalVotes
        }, key);
      }), /* @__PURE__ */ jsx("div", {
        className: "PollNode__footer",
        children: /* @__PURE__ */ jsx(Button, {
          onClick: addOption,
          small: true,
          children: "Add Option"
        })
      })]
    })
  });
}
export { PollComponent as default };
