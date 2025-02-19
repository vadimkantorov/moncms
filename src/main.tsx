// @ts-nocheck

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import {useRef, useState} from 'react';
import {EditorRefPlugin} from "@lexical/react/LexicalEditorRefPlugin";
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  EditorState, $getRoot, $createParagraphNode,$createTextNode,
  $isTextNode,
  DOMConversionMap,
  DOMExportOutput,
  DOMExportOutputMap,
  isHTMLElement,
  Klass,
  LexicalEditor,
  LexicalNode,
  ParagraphNode,
  TextNode,
} from 'lexical';
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
//import {PLAYGROUND_TRANSFORMERS} from './plugins/MarkdownTransformers';
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { LinkNode } from "@lexical/link";
import { HashtagNode } from "@lexical/hashtag";
import { ListNode, ListItemNode } from "@lexical/list";

import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import {parseAllowedColor, parseAllowedFontSize} from './styleConfig';


import { join2 } from './filepathutils.ts';
import { github_api_rename_file, github_api_get_file_dir, github_api_upsert_file, github_api_format_error, github_discover_url, github_api_prepare_params, github_api_update_file, github_api_get_file, github_api_signin, github_api_create_file, github_api_delete_file } from './github.ts';
import { format_frontmatter, parse_frontmatter, update_frontmatter } from './frontmatter.ts';
import { cache_load, cache_save } from './cacheutils.ts';
import { add_file_tree, delete_file_tree, rename_file_tree, update_file_tree } from './filetreeutils.ts';

const removeStylesExportDOM = (
  editor: LexicalEditor,
  target: LexicalNode,
): DOMExportOutput => {
  const output = target.exportDOM(editor);
  if (output && isHTMLElement(output.element)) {
    // Remove all inline styles and classes if the element is an HTMLElement
    // Children are checked as well since TextNode can be nested
    // in i, b, and strong tags.
    for (const el of [
      output.element,
      ...output.element.querySelectorAll('[style],[class],[dir="ltr"]'),
    ]) {
      el.removeAttribute('class');
      el.removeAttribute('style');
      if (el.getAttribute('dir') === 'ltr') {
        el.removeAttribute('dir');
      }
    }
  }
  return output;
};

const exportMap: DOMExportOutputMap = new Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>([
  [ParagraphNode, removeStylesExportDOM],
  [TextNode, removeStylesExportDOM],
]);

const getExtraStyles = (element: HTMLElement): string => {
  // Parse styles from pasted input, but only if they match exactly the
  // sort of styles that would be produced by exportDOM
  let extraStyles = '';
  const fontSize = parseAllowedFontSize(element.style.fontSize);
  const backgroundColor = parseAllowedColor(element.style.backgroundColor);
  const color = parseAllowedColor(element.style.color);
  if (fontSize !== '' && fontSize !== '15px') {
    extraStyles += `font-size: ${fontSize};`;
  }
  if (backgroundColor !== '' && backgroundColor !== 'rgb(255, 255, 255)') {
    extraStyles += `background-color: ${backgroundColor};`;
  }
  if (color !== '' && color !== 'rgb(0, 0, 0)') {
    extraStyles += `color: ${color};`;
  }
  return extraStyles;
};

const constructImportMap = (): DOMConversionMap => {
  const importMap: DOMConversionMap = {};

  // Wrap all TextNode importers with a function that also imports
  // the custom styles implemented by the playground
  for (const [tag, fn] of Object.entries(TextNode.importDOM() || {})) {
    importMap[tag] = (importNode) => {
      const importer = fn(importNode);
      if (!importer) {
        return null;
      }
      return {
        ...importer,
        conversion: (element) => {
          const output = importer.conversion(element);
          if (
            output === null ||
            output.forChild === undefined ||
            output.after !== undefined ||
            output.node !== null
          ) {
            return output;
          }
          const extraStyles = getExtraStyles(element);
          if (extraStyles) {
            const {forChild} = output;
            return {
              ...output,
              forChild: (child, parent) => {
                const textNode = forChild(child, parent);
                if ($isTextNode(textNode)) {
                  textNode.setStyle(textNode.getStyle() + extraStyles);
                }
                return textNode;
              },
            };
          }
          return output;
        },
      };
    };
  }

  return importMap;
};

const ExampleTheme = {
  code: 'editor-code',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
  },
  image: 'editor-image',
  link: 'editor-link',
  list: {
    listitem: 'editor-listitem',
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
  },
  ltr: 'ltr',
  paragraph: 'editor-paragraph',
  placeholder: 'editor-placeholder',
  quote: 'editor-quote',
  rtl: 'rtl',
  text: {
    bold: 'editor-text-bold',
    code: 'editor-text-code',
    hashtag: 'editor-text-hashtag',
    italic: 'editor-text-italic',
    overflowed: 'editor-text-overflowed',
    strikethrough: 'editor-text-strikethrough',
    underline: 'editor-text-underline',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
  },
};

const editorConfig = {
  html: {
    export: exportMap,
    import: constructImportMap(),
  },
  namespace: 'React.js Demo',
  nodes: [ParagraphNode, TextNode, HeadingNode, ListNode, ListItemNode],
  onError(error: Error) {
    throw error;
  },
  theme: ExampleTheme,
};

const placeholder = 'Enter some rich text...';

function App() {
    const editorRef = useRef(null);
    const [log, setLog] = useState('');
    const [token, setToken] = useState('');
    const [url, setUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [isCompact, setIsCompact] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);

    let retrieved_contents = {};

    function window_editor_setMarkdown(markdown : string)
    {
        editorRef.current?.update(() => {
            const editorState = editorRef.current?.getEditorState();
            if (editorState != null) {
                $convertFromMarkdownString(markdown, TRANSFORMERS);//PLAYGROUND_TRANSFORMERS) 
                $getRoot().selectStart();
            }                                                                                                                       })
    }

    function window_editor_getMarkdown() : Promise<string>
    {
        return new Promise(resolve => {
            editorRef.current?.update(() => {
                const md = $convertToMarkdownString(TRANSFORMERS);//PLAYGROUND_TRANSFORMERS);
                resolve(md);
            })
        });
    }

    function window_editor_setEditable(editable : boolean)
    {
        editorRef.current.setEditable(editable);
    }

    function moncms_log(text : string)
    {
        const now = new Date().toISOString();
        setLog(`${now}: ${text}`);
        //html_log.value += '\n' + text; html_log.scrollTop = html_log.scrollHeight;
    }

    function update_location(path : string)
    {
        // https://stackoverflow.com/questions/2494213/changing-window-location-without-triggering-refresh
        window.history.replaceState({}, document.title, path );
    }

    function clear(file_tree = true, msg = '')
    {
        const html_file_tree = document.getElementById('html_file_tree');
        const html_file_name = document.getElementById('html_file_name');
        retrieved_contents = {};
        html_file_name.value = html_file_name.title = '';
        if(file_tree)
        {
            for(let i = html_file_tree.options.length - 1; i >= 0; i--)
                html_file_tree.options.remove(i);
        }
        return window_editor_setMarkdown(msg);
    }
    function onchange_files()
    {
        // https://stackoverflow.com/questions/572768/styling-an-input-type-file-button/25825731#25825731
        const html_files = document.getElementById('html_files');
        for(const file of html_files.files)
        {
            const new_file_name = file.name;
            const reader = new FileReader();
            reader.onload = () => github_api_upsert_file(prep, new_file_name, reader.result.split(',')[1], add_file_tree, moncms_log);
            reader.onerror = () => moncms_log('FILELOAD error');
            reader.readAsDataURL(file);
        }
        html_files.value = '';
    }

    async function onclick_createfile()
    {
        const html_createfile = document.getElementById('html_createfile');
        const html_file_name = document.getElementById('html_file_name');

        await clear(false, html_createfile.dataset.message);
        const now = new Date().toISOString();
        const date = now.slice(0, '0000-00-00'.length);
        const time = now.slice('0000-00-00'.length, '0000-00-00'.length + 'T00:00:00'.length).toLowerCase().replaceAll(':', '');
        html_file_name.value = `${date}-new-post-draft-a${time}.md`; 
        html_file_name.focus();
    }

    async function onclick_createdir()
    {
        const html_createdir = document.getElementById('html_createdir');
        const html_file_name = document.getElementById('html_file_name');
        await clear(false, html_createdir.dataset.message);
        const now = new Date().toISOString();
        const time = now.slice('0000-00-00'.length, '0000-00-00'.length + 'T00:00:00'.length).toLowerCase().replaceAll(':', '');
        html_file_name.value = `new-dir-a${time}/.gitignore`;
        html_file_name.focus();
    }

    async function onclick_help(event)
    {
        const html_url = document.getElementById('html_url');
        const html_token = document.getElementById('html_token');
        html_url.value = event.target.dataset.message;
        html_token.value = '';
        onclick_open();
    }

    async function onclick_delfile()
    {
        const html_url = document.getElementById('html_url');
        const html_token = document.getElementById('html_token');
        const html_delfile = document.getElementById('html_delfile');
        const html_file_name = document.getElementById('html_file_name');
        if(Object.entries(retrieved_contents || {}).length == 0)
        {
            await clear(false);
            html_file_name.value = '';
            return html_file_name.focus();
        }
        const prep = github_api_prepare_params(html_url.value, html_token.value, true);
        if(prep.error)
            return moncms_log(prep.error);
        if(!html_file_name.value || !window.confirm(html_delfile.dataset.message))
            return;

        await github_api_delete_file(prep, retrieved_contents, moncms_log);
        delete_file_tree(html_file_name.value);
        html_url.value = prep.curdir_url;
        clear(false);
    }

    function onclick_upload()
    {
        const html_url = document.getElementById('html_url');
        const html_token = document.getElementById('html_token');
        const html_files = document.getElementById('html_files');
        const prep = github_api_prepare_params(html_url.value, html_token.value, true);
        if(prep.error)
            return moncms_log(prep.error);
        
        html_files.click();
    }

    async function onclick_savefile()
    {
        // https://stackoverflow.com/questions/37504383/button-inside-a-label
        // https://stackoverflow.com/questions/31563444/rename-a-file-with-github-api
        // https://medium.com/@obodley/renaming-a-file-using-the-git-api-fed1e6f04188
        // https://www.levibotelho.com/development/commit-a-file-with-the-github-api/

        const html_url = document.getElementById('html_url');
        const html_token = document.getElementById('html_token');
        const html_file_name = document.getElementById('html_file_name');
        const html_frontmatter = document.getElementById('html_frontmatter');
        if(!html_file_name.value)
            return moncms_log('cannot save a file without file name');
        const prep = github_api_prepare_params(html_url.value, html_token.value, true);
        if(prep.error)
            return moncms_log(prep.error);

        const frontmatter_str = format_frontmatter(html_frontmatter);
        const text = ''; //FIXME: await editor_getMarkdown();
        const base64 = window.btoa(String.fromCodePoint(...(new TextEncoder().encode(frontmatter_str + text)))).replaceAll('\n', '');

        if(retrieved_contents.encoding == 'base64' && retrieved_contents.content.replaceAll('\n', '') == base64 && html_file_name.value == retrieved_contents.name && html_frontmatter.dataset.empty == 'true' && !frontmatter_str)
            return moncms_log('no changes');
        
        const new_file_name = html_file_name.value;
        const should_rename = retrieved_contents && new_file_name != retrieved_contents.name;
        const should_update = retrieved_contents && new_file_name == retrieved_contents.name;
        const should_create = Object.entries(retrieved_contents || {}).length == 0 && new_file_name;

        if(should_update)
        {
            const res_put = await github_api_update_file(prep, retrieved_contents.sha, base64, moncms_log).pop();
            retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
        }
        else if(should_create)
        {
            const res_put = await github_api_create_file({...prep, contents_api_url_put : join2(prep.contents_api_dir_url_put, new_file_name)}, base64, moncms_log).pop();
            retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
        }
        else if(should_rename)
        {
            retrieved_contents = await github_api_rename_file(prep, new_file_name, base64, retrieved_contents, moncms_log);
            rename_file_tree(_retrieved_contents.name, retrieved_contents);
        }
    }

    async function onclick_open(HTTP_OK = 200, ext = ['.gif', '.jpg', '.png', '.svg'])
    {
        const html_url = document.getElementById('html_url');
        const html_token = document.getElementById('html_token');
        const html_file_tree = document.getElementById('html_file_tree');
        const html_frontmatter = document.getElementById('html_frontmatter');
        let prep = github_api_prepare_params(html_url.value, html_token.value);
        if(prep.error)
        {
            clear();
            return moncms_log(prep.error);
        }
        if(!html_token.value)
        {
            html_token.value = cache_load(prep.github_repo_url);
            prep = github_api_prepare_params(html_url.value, html_token.value); 
            if(html_token.value)
                moncms_log('got from cache for ' + prep.github_repo_url);
        }
        setIsSignedIn(html_token.value ? true : false);

        const [res_file, res_dir] = await github_api_get_file_dir(prep, moncms_log);

        const key_by_name = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        const is_dir = res_file.content === undefined;
        const is_err = Object.entries(res_file).length == 0 && res_dir == null;
        const is_image = !is_dir && ext.some(e => res_file.name.endsWith(e));
        const images = res_dir.filter(j =>j.type == 'file' && ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const image_listing = images.map(j => `# ${j.name}\n![${j.name}](${j.download_url})`).join('\n\n');
        // https://lexical.dev/docs/concepts/read-only

        retrieved_contents = res_file;
        
        if(is_err)
        {
            html_file_name.value = '';
            html_file_name.title = '';
            clear();
        }
        else if(is_dir)
        {
            html_file_name.value = '';
            html_file_name.title = prep.github_repo_path;

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, html_file_name.value);
            update_frontmatter(html_frontmatter, null);
            
            html_file_tree.selectedIndex = 0;
            window_editor_setMarkdown(image_listing);
            window_editor_setEditable(false);
            html_file_tree.focus();
        }
        else if(!is_image)
        {
            html_file_name.value = res_file.name;
            html_file_name.title = prep.github_repo_path;

            let [text, frontmatter] = [res_file.encoding == 'base64' ? new TextDecoder().decode(Uint8Array.from(window.atob(res_file.content), m => m.codePointAt(0))) : res_file.encoding == 'none' ? ('<file too large>') : (res_file.content || ''), {}];
            [text, frontmatter] = parse_frontmatter(text); 
            
            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, html_file_name.value);
            update_frontmatter(html_frontmatter, frontmatter);
            window_editor_setMarkdown(text);
            window_editor_setEditable(true);
        }
        else if(is_image)
        {
            html_file_name.value = res_file.name;
            html_file_name.title = prep.github_repo_path;

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, html_file_name.value);
            update_frontmatter(html_frontmatter, null);
            window_editor_setMarkdown(`# ${res_file.name}\n![${res_file.name}](${res_file.download_url})`);
            window_editor_setMarkdown(`<img src="${res_file.download_url}" height="100px"/>`);
            window_editor_setEditable(false);
        }
    }

    function onclick_addrow(event)
    {
        const html_frontmatter = document.getElementById('html_frontmatter');
        const html_row = event.target.parentElement.parentElement;
        const rowIdx = html_row.rowIndex;
        
        const html_header = html_row.cloneNode(true);
        const [html_inputkey, html_inputval] = Array.from(html_header.getElementsByTagName('input'));
        if(!html_inputkey.value)
            return;

        [html_inputkey.value, html_inputval.value] = ['', ''];
        
        if(rowIdx == 0)
            html_row.parentNode.insertBefore(html_header, html_row);
        else if(rowIdx < html_frontmatter.children.length - 1)
            html_row.parentNode.insertBefore(html_header, html_row.nextSibling);
        else
            html_frontmatter.appendChild(html_header);
    }

    function onclick_delrow(event)
    {
        const html_frontmatter = document.getElementById('html_frontmatter');
        const html_row = event.target.parentElement.parentElement;
        const rowIdx = html_row.rowIndex;

        if(rowIdx == 0)
        {
            const [html_inputkey, html_inputval] = Array.from(html_row.getElementsByTagName('input'));
            [html_inputkey.value, html_inputval.value] = ['', ''];
        }
        else
            html_frontmatter.deleteRow(rowIdx);
    }

    function ondblclick_enter_file_tree(event)
    {
        const html_file_tree = document.getElementById('html_file_tree');
        if (event.type == 'dblclick' || event.code == 'Space' || event.code == 'Enter')
        {
            const html_option = html_file_tree.options[html_file_tree.selectedIndex];
            const html_url = document.getElementById('html_url');
            html_url.value = html_option.value;
            onclick_open();
        }
    }

    async function onclick_signinout()
    {
        const html_url = document.getElementById('html_url');
        const html_token = document.getElementById('html_token');
        if(!isSignedIn)
        {
            if(!html_token.value)
                return moncms_log('cannot signin, no token provided');

            const prep = github_api_prepare_params(html_url.value, html_token.value);
            if(!prep.github_repo_url || prep.error)
            {
                if(!prep.error) moncms_log(prep.error);
                return;
            }

            cache_save(prep.github_repo_url, null);

            if(await github_api_signin(prep, moncms_log))
            {
                cache_save(prep.github_repo_url, html_token.value);
                setIsSignedIn(true);
                moncms_log('saved to cache for ' + prep.github_repo_url);
                onclick_open();
            }
            else
                clear();
        }
        else if(isSignedIn)
        {
            clear();
            html_token.value = '';
            setIsSignedIn(false);
            
            const prep = github_api_prepare_params(html_url.value);
            if(prep.github_repo_url)
            {
                cache_save(prep.github_repo_url, null);
                moncms_log('cleared and purged cache for ' + prep.github_repo_url);
            }
        }
    }

    async function onload_body()
    {
        if(window.location.search)
        {
            const query_string = new URLSearchParams(window.location.search);
            for(const k of ['html_url', 'html_token'])
                if(query_string.has(k))
                    document.getElementById(k).value = query_string.get(k);

            console.log(github_api_prepare_params(html_url.value));
        }

        const html_url = document.getElementById('html_url');
        const html_token = document.getElementById('html_token');

        if(!html_url.value)
        {
            const discovered = await github_discover_url(window.location.href);
            moncms_log('discovered url:' + discovered);
            const prep = github_api_prepare_params(window.location.protocol != 'file:' ? window.location.href : discovered);
            html_url.value = discovered || prep.github_repo_url;
        }

        if(!html_token.value)
        {
            const prep = github_api_prepare_params(html_url.value);
            if(prep.github_repo_url)
            {
                html_token.value = cache_load(prep.github_repo_url);
                if(html_token.value)
                    moncms_log('got from cache for ' + prep.github_repo_url);
            }
        }

        if(html_url.value)
            onclick_open();
        else
            html_url.focus();
    }
  
  return (
    <>
      <input placeholder="GitHub or public URL:" title="GitHub or public URL:" id="html_url" type="text"  onKeyPress={(event) => event.code == 'Enter' && onclick_open()} />
      <input hidden={isCompact} placeholder="GitHub token:" title="GitHub token:" id="html_token" type="text" onKeyPress={(event) => event.code == 'Enter' && onclick_open()} />
      <input hidden={isCompact} placeholder="File name:" title="File name:" id="html_file_name" type="text" onKeyPress={(event) => event.code == 'Enter' && onclick_savefile()} />
      <input hidden={isCompact} placeholder="Log:" title="Log:" value={log} readOnly />
      <select hidden={isCompact} id="html_file_tree" size="10" onKeyPress={ondblclick_enter_file_tree} onDoubleClick={ondblclick_enter_file_tree}></select>
      <table hidden={isCompact} id="html_frontmatter">
        <tbody>
          <tr><td><input type="text" placeholder="Frontmatter key:" /></td><td><input type="text" placeholder="Frontmatter value:" /></td><td><button onClick={onclick_addrow}>Add another row</button><button onClick={onclick_delrow}>Delete this row</button></td></tr>
        </tbody>
      </table>

      <button onClick={onclick_open}>Open</button>
      <button onClick={onclick_savefile}>Save File</button>
      <button onClick={onclick_delfile} id="html_delfile" data-message="Do you really want to delete this file?">Delete File</button>
      <button onClick={onclick_createfile} id="html_createfile" data-message="### modify the file name, modify this content and click Save to actually create and save the file">New File</button>
      <button onClick={onclick_createdir} id="html_createdir" data-message="### modify the directory name, and then click Save to create the file and the directory">New Folder</button>
      
      <button onClick={onclick_upload}>Upload Files</button>
      <input type="file" id="html_files" onChange={onchange_files} multiple hidden />
      
      <button onClick={onclick_help} data-message="https://github.com/vadimkantorov/moncms/blob/master/README.md">Help</button>
      <button onClick={onclick_signinout} className={isSignedIn ? "signout" : "signin"} ></button>
      <button onClick={() => setIsCompact(!isCompact)}>Toggle Compact View</button>
      
    <LexicalComposer initialConfig={editorConfig}>
      <EditorRefPlugin editorRef={editorRef} />
      <div className="editor-container">
        <ToolbarPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
                aria-placeholder={placeholder}
                placeholder={
                  <div className="editor-placeholder">{placeholder}</div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <TreeViewPlugin />
        </div>
      </div>
    </LexicalComposer>

    </>
  );
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="App">
        <App />
    </div>
  </React.StrictMode>
);
