# Build
```
npm install
npm run build
python -m http.server -d dist
```

# Update
```
LEXICALVER=0.25.0
curl -L https://github.com/facebook/lexical/archive/refs/tags/v$LEXICALVER.tar.gz | tar -xzf - --strip-components=1 lexical-$LEXICALVER/packages/lexical-playground lexical-$LEXICALVER/packages/shared && git add -A -f packages

cp packages/lexical-playground/src/ui/{Button.css,Button.tsx,ContentEditable.css,ContentEditable.tsx,Dialog.css,Dialog.tsx,FileInput.tsx,ImageResizer.tsx,Input.css,Modal.css,Modals.tsx,TextInput.tsx} src/ui/
cp packages/lexical-playground/src/hooks/useModal.tsx src/hooks/
cp packages/lexical-playground/src/utils/joinClasses.ts src/utils/
cp packages/lexical-playground/src/nodes/{ImageNode.css,ImageNode.tsx} src/nodes/

# cp packages/lexical-playground/src/plugins/ImagesPlugin/index.tsx src/plugins/ImagesPlugin.tsx
# cp packages/lexical-playground/src/nodes/ImageComponent.tsx src/nodes/
# cp packages/lexical-playground/src/plugins/MarkdownTransformers/index.ts src/plugins/MarkdownTrasformers.ts
```

# References
- https://github.com/Faris-Abuali/Lexical-Rich-Text-Editor
- https://konstantin.digital/blog/how-to-build-a-text-editor-with-lexical-and-react

# Errors
```
chunk-ILZ4WIQS.js?v=e2888588:3900 Uncaught (in promise) Error: Create node: Attempted to create node _CodeNode that was not configured to be used on the editor.
    at main.tsx:217:17
```
