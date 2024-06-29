# Lexical toolbar
- Markdown
- Undo
- Redo
- DIVIDER
- Format style
- DIVIDER
- Font family
- DIVIDER
- Font weight -size+
- DIVIDER
- Bold
- Italic
- Underscore
- Insert code block
- Insert link
- Text color
- Highlight color
- Text style: strikethrough, subscript, suprescript, clear formatting
- DIVIDER
- Insert block
- Align

# Google Docs toolbar
- Search Menus
- Undo
- Redo
- Print
- Spellcheck
- Print format
- Zoom
- DIVIDER
- Format style
- DIVIDER
- Font family
- DIVIDER
- Font weight -size+
- DIVIDER
- Bold
- Italic
- Underscore
- Text color
- Highlight color
- DIVIDER
- Insert link
- Add comment
- Insert image
- DIVIDER
- Align
- Line & paragraph spacing
- Checklist
- Bulleted list
- Numbered list
- Decrease indent
- Increase list
- Clear formatting
- DIVIDER
- Editing mode: Editing/Viewing
- DIVIDER
- Hiding the menus

# Links
- [https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms/blob/gh-pages/README.md](https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms/blob/gh-pages/README.md)
- [https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms/tree/gh-pages](https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms/tree/gh-pages)
- [https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms/tree/gh-pages/assets](https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms/tree/gh-pages/assets)
- [https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms](https://vadimkantorov.github.io/moncms/?html_url=https://github.com/vadimkantorov/moncms)

Test:
![image](assets/yellow-flower.a2a7c7a2.jpg)
- [https://vadimkantorov.github.io/moncms/?https://github.com/vadimkantorov/moncms](https://vadimkantorov.github.io/moncms/?https://github.com/vadimkantorov/moncms)
- [https://vadimkantorov.github.io/moncms/?/https://github.com/vadimkantorov/moncms](https://vadimkantorov.github.io/moncms/?/https://github.com/vadimkantorov/moncms)

# Update https://github.com/facebook/lexical
```shell
wget https://github.com/facebook/lexical/archive/refs/tags/v0.16.0.tar.gz && tar -xf v0.16.0.tar.gz --strip-components=1 lexical-0.16.0/packages/lexical-playground lexical-0.16.0/packages/shared && git add -A -f packages
```

# lexical-playground-only
```html
<html>
    <head>
        <link rel="stylesheet" href="/assets/main.css">
        <script type="module" crossorigin src="/assets/main.js" onload="on_editor_script_loaded()"></script>
    </head>
    <body>
        <div id="editor"></div>
        <script>
        async function on_editor_script_loaded()
        {
            const editor = await window.LexicalMarkdownEditor('#editor');
            console.log(editor._getRawEditorInstance())

            const md = `
# [WIP ] lexical-playground-only

The idea is to have https://github.com/facebook/lexical/tree/main/packages/lexical-playground as a separate, lean repo bundlable as a single JS file to be used as a simple client-side markdown editor with usage API similar to https://github.com/quilljs/quill (and usable in vanilla HTML/JS without mandatory usage of package managers/bundlers/react)

Based on the broken release https://github.com/facebook/lexical/releases/tag/v0.12.5: https://github.com/facebook/lexical/discussions/5392

- do this
- do that
- cheers
`
            editor.setMarkdown(md)

            console.log(await editor.getMarkdown())

            window.editor = editor;
        }
        </script>
    </body>
</html>
```

# References

- [https://editorjs.io/](https://editorjs.io/)
- [https://lexical.dev/](https://lexical.dev/)
- [https://tiptap.dev](https://tiptap.dev)
- [https://smikic.com/posts/editorjs-markdown-parser.html](https://smikic.com/posts/editorjs-markdown-parser.html)
- [https://github.com/factly/dega/issues/454](https://github.com/factly/dega/issues/454)
- [https://github.com/Sunnysit/markdown-blocks-editor/tree/staging](https://github.com/Sunnysit/markdown-blocks-editor/tree/staging)
- [https://stackedit.io/](https://stackedit.io/)
- [https://github.com/marktext/muya](https://github.com/marktext/muya)
- [https://github.com/tunaltd/blocks-editor](https://github.com/tunaltd/blocks-editor)
- [https://arne.me/articles/write-your-own-ssg](https://arne.me/articles/write-your-own-ssg)
- [https://jaredkrinke.github.io/md2blog/](https://jaredkrinke.github.io/md2blog/)
- [https://github.com/kerwanp/notion-render](https://github.com/kerwanp/notion-render)
- [https://www.blocknotejs.org/](https://www.blocknotejs.org/)
- [https://jawher.me/moving-from-jekyll-to-pelican/](https://jawher.me/moving-from-jekyll-to-pelican/)
- [https://github.com/Darginec05/Yopta-Editor](https://github.com/Darginec05/Yopta-Editor)
- [https://codepen.io/voziv/pen/rmpVZb](https://codepen.io/voziv/pen/rmpVZb)

- [https://www.letsreact.org/how-to-create-a-react-app-without-npm/?utm_content=cmp-true](https://www.letsreact.org/how-to-create-a-react-app-without-npm/?utm_content=cmp-true)
- [https://medium.com/@chrislewisdev/react-without-npm-babel-or-webpack-1e9a6049714](https://medium.com/@chrislewisdev/react-without-npm-babel-or-webpack-1e9a6049714)
- [https://bernieslearnings.com/react-without-npm/?utm_content=cmp-true](https://bernieslearnings.com/react-without-npm/?utm_content=cmp-true)
- [https://kentcdodds.com/blog/super-simple-start-to-react](https://kentcdodds.com/blog/super-simple-start-to-react)

- [https://medium.com/codex/ditching-markdown-editors-for-quill-bbd314d546b7](https://medium.com/codex/ditching-markdown-editors-for-quill-bbd314d546b7)
- https://stackoverflow.com/questions/572768/styling-an-input-type-file-button/25825731#comment91932951_25825731
- https://stackoverflow.com/questions/61742164/label-inside-of-button-click-button-and-activate-the-label
- https://stackoverflow.com/questions/37504383/button-inside-a-label
- https://stackoverflow.com/questions/572768/styling-an-input-type-file-button/25825731#25825731
- https://finnian.io/blog/lexical-integration-actiontext-rails/
- https://www.facebook.com/MetaOpenSource/videos/847531169669308/
- https://github.com/mmistakes/minimal-mistakes
- https://github.com/richardtallent/vite-plugin-singlefile
- https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
