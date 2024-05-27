import { g as LexicalCollaborationContext_1, L as LexicalComposerContext_1, r as react } from "./main.29906b64.js";
var LexicalNestedComposer_prod = {};
var d = LexicalCollaborationContext_1, m = LexicalComposerContext_1, r = react.exports;
function t(a) {
  let h = new URLSearchParams();
  h.append("code", a);
  for (let e = 1; e < arguments.length; e++)
    h.append("v", arguments[e]);
  throw Error(`Minified Lexical error #${a}; visit https://lexical.dev/docs/error?${h} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`);
}
LexicalNestedComposer_prod.LexicalNestedComposer = function({ initialEditor: a, children: h, initialNodes: e, initialTheme: u, skipCollabChecks: v }) {
  let q = r.useRef(false), n = r.useContext(m.LexicalComposerContext);
  null == n && t(9);
  let [f, { getTheme: w }] = n, y = r.useMemo(() => {
    var b = u || w() || void 0;
    const x = m.createLexicalComposerContext(n, b);
    void 0 !== b && (a._config.theme = b);
    a._parentEditor = f;
    if (e)
      for (var c of e) {
        var g = b = null;
        "function" !== typeof c && (g = c, c = g.replace, b = g.with, g = g.withKlass || null);
        const k = a._nodes.get(c.getType());
        a._nodes.set(
          c.getType(),
          { exportDOM: k ? k.exportDOM : void 0, klass: c, replace: b, replaceWithKlass: g, transforms: /* @__PURE__ */ new Set() }
        );
      }
    else {
      c = a._nodes = new Map(f._nodes);
      for (const [k, l] of c)
        a._nodes.set(k, { exportDOM: l.exportDOM, klass: l.klass, replace: l.replace, replaceWithKlass: l.replaceWithKlass, transforms: /* @__PURE__ */ new Set() });
    }
    a._config.namespace = f._config.namespace;
    a._editable = f._editable;
    return [a, x];
  }, []), { isCollabActive: z, yjsDocMap: A } = d.useCollaborationContext(), p = v || q.current || A.has(a.getKey());
  r.useEffect(() => {
    p && (q.current = true);
  }, [p]);
  r.useEffect(() => f.registerEditableListener((b) => {
    a.setEditable(b);
  }), [a, f]);
  return r.createElement(m.LexicalComposerContext.Provider, { value: y }, !z || p ? h : null);
};
const LexicalNestedComposer = LexicalNestedComposer_prod;
var LexicalNestedComposer_1 = LexicalNestedComposer;
export { LexicalNestedComposer_1 as L };
