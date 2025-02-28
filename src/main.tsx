// @ts-nocheck

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import {useRef, useState} from 'react';
import {EditorRefPlugin} from "@lexical/react/LexicalEditorRefPlugin";
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {EditorState, $getRoot, $createParagraphNode,$createTextNode, $isTextNode, $nodesOfType,
    DOMConversionMap, DOMExportOutput, DOMExportOutputMap, isHTMLElement, Klass, LexicalEditor,
    LexicalNode, ParagraphNode, TextNode,
} from 'lexical';
import Prism from "prismjs"; if (typeof globalThis.Prism === 'undefined') { globalThis.Prism = Prism;}
import {CodeNode} from '@lexical/code';
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import {PLAYGROUND_TRANSFORMERS} from './plugins/MarkdownTransformers';
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { LinkNode } from "@lexical/link";
import { HashtagNode } from "@lexical/hashtag";
import { ListNode, ListItemNode } from "@lexical/list";
import {ImageNode} from './nodes/ImageNode';

import ToolbarPlugin from './plugins/ToolbarPlugin';
import ImagesPlugin from './plugins/ImagesPlugin.tsx';

import {parseAllowedColor, parseAllowedFontSize} from './styleConfig';

import { github_api_rename_file, github_api_get_file_dir, github_api_upsert_file, github_api_format_error, github_api_prepare_params, github_api_update_file, github_api_get_file, github_api_signin, github_api_create_file, github_api_delete_file } from './github.ts';

const theme = {
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
    theme: theme,
    namespace: 'moncms',
    nodes: [ParagraphNode, TextNode, HeadingNode, ListNode, ListItemNode, CodeNode, ImageNode],
    onError(error: Error) { throw error; },
};


function parse_frontmatter(text : string) : [string, Object]
{
    const m = text.match(/^---\n(.*?)\n---\n*/s);
    let frontmatter = null;
    if(m)
    {
        const frontmatter_str = m[1];
        text = text.substring(m[0].length);

        const procval = s => (s.length >= 2 && s[0] == '"' && s[s.length - 1] == '"') ? s.slice(1, s.length - 1) : (s.length >= 2 && s[0] == "'" && s[s.length - 1] == "'") ? s.slice(1, s.length - 1) : s;

        for(const line of frontmatter_str.split('\n'))
        {
            const line_strip = line.trim();
            const is_list_item = line_strip.startsWith('- ');
            if(!line || line.startsWith('#'))
                continue;

            const colonIdx = line.indexOf(':');
            const key = colonIdx != -1 ? line.slice(0, colonIdx).trim() : '';
            const val = colonIdx != -1 ? line.substring(1 + colonIdx).trim() : is_list_item ? line_strip.substring(2).trim() : '';
            
            if(colonIdx != -1)
            {
                if(!frontmatter)
                    frontmatter = {};
                frontmatter[key] = val ? procval(val) : [];
            }
            else if(is_list_item)
            {
                if(!frontmatter)
                    frontmatter = {};
                if(!front_matter[key])
                    frontmatter[key] = [];
                frontmatter[key].push(procval(val));
            }
        }
    }
    return [text, frontmatter];
}

function update_location(path : string)
{
    // https://stackoverflow.com/questions/2494213/changing-window-location-without-triggering-refresh
    window.history.replaceState({}, document.title, path );
}

function cache_load(key : string)
{
    return localStorage.getItem("moncms_" + key) || '';
}

function cache_save(key : string, value : string)
{
    if (value)
        localStorage.setItem("moncms_" + key, value);
    else
        localStorage.removeItem("moncms_" + key);
}

function load_token(url_value)
{
    const prep = github_api_prepare_params(url_value);
    return prep.github_repo_url ? cache_load(prep.github_repo_url) : '';
}

function fmt_log(text : string)
{
    const now = new Date().toISOString();
    return `${now}: ${text}`;
}

function find_meta(doc, key)
{
    return (Array.from(doc.querySelectorAll('meta')).filter(meta => meta.name == key).pop() || {}).content || '';
}

async function github_discover_url(url : string, key = 'moncmsdefault', HTTP_OK = 200) : string
{
    if(!url)
        return '';
    if(url == window.location.href || !url.startsWith('file:'))
    {
        let doc = document;
        if(url != window.location.href)
        {
            const resp = await fetch(url).catch(err => ({ok: false, e : err}));
            if(!resp.ok) return '';
            const html = await resp.text();
            doc = (new DOMParser()).parseFromString(html, 'text/html');
        }
        return find_meta(doc, key);
    }
    return '';
}

function format_frontmatter(frontMatter : Array, notEmpty : boolean) : string
{
    const frontmatter_str_inside = frontMatter.map(({frontmatter_key, frontmatter_val}) => `${frontmatter_key}: "${frontmatter_val}"`).join('\n');
    const frontmatter_str = `---\n${frontmatter_str_inside}\n---\n\n`;
    if (notEmpty)
        return frontmatter_str;
    return frontmatter_str_inside ? frontmatter_str : '';
}

function App() {
    let url_value = '', token_value = '', log_value = '', retrieved_contents = {}, frontMatterEmpty = true;

    const meta_key = 'moncmsdefault';

    if(window.location.search)
    {
        const query_string = new URLSearchParams(window.location.search);
        if(query_string.has('html_url'))
            url_value = query_string.get('html_url');
        if(query_string.has('html_token'))
            token_value = query_string.get('html_token');
        if(!url_value)
            url_value = find_meta(document, meta_key);
        if(url_value && !token_value)
        {
            token_value = load_token(url_value);
            if(token_value)
                log_value = fmt_log('got from cache for ' + prep.github_repo_url);
        }
    }
    const editorRef = useRef(null);
    const fileNameRef = useRef(null);
    const urlRef = useRef(null);

    const [log, setLog] = useState(log_value);
    const [token, setToken] = useState(token_value);
    const [url, setUrl] = useState(url_value);
    const [fileName, setFileName] = useState('');
    const [fileNameTitle, setFileNameTitle] = useState('');
    const [isCompact, setIsCompact] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [fileTree, setFileTree] = useState([]);
    const [fileTreeValue, setFileTreeValue] = useState('');
    const [frontMatter, setFrontMatter] = useState([{frontmatter_key : '', frontmatter_val : ''}]);

    console.log('retry app');
    useEffect(() => 
    {
        /*
        if(!url_value)
        {
            const url_discovered = await github_discover_url(window.location.href, meta_key);
            const prep = github_api_prepare_params(window.location.protocol != 'file:' ? window.location.href : url_discovered);
            url_value = url_discovered || prep.github_repo_url;
            if(url_value && !token_value)
                token_value = load_token(url_value);
            setUrl(url_value);
            setToken(token_value);
        }
        */
       console.log('retry effect');
        if(url)
            open_file_or_dir(url, token);
        else
            urlRef.current.focus();
    }, []);

    function window_editor_setMarkdown(markdown : string) : Promise
    {
        return new Promise(resolve => {
            editorRef.current?.update(() => {
                const editorState = editorRef.current?.getEditorState();
                if (editorState != null) {
                    $convertFromMarkdownString(markdown, PLAYGROUND_TRANSFORMERS); //TRANSFORMERS);
                    $getRoot().selectStart();
                }
                resolve();
            });
        });
    }

    function window_editor_getMarkdown() : Promise<string>
    {
        return new Promise(resolve => {
            editorRef.current?.update(() => {
                const md = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS); //TRANSFORMERS);
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
        setLog(fmt_log(text));
    }

    function clear(file_tree = true, msg = '', front_matter = true)
    {
        retrieved_contents = {};
        setFileName('');
        if(file_tree)
            setFileTree([]);
        if(front_matter)
            setFrontMatter([{frontmatter_key : '', frontmatter_val : ''}]);
        
        return window_editor_setMarkdown(msg);
    }

    function onchange_files(event)
    {
        console.log(event);
        // https://stackoverflow.com/questions/572768/styling-an-input-type-file-button/25825731#25825731
        for(const file of event.target.files)
        {
            const new_file_name = file.name;
            const reader = new FileReader();
            reader.onload = () => github_api_upsert_file(
                prep, 
                new_file_name, 
                reader.result.split(',')[1],
                (res) => add_file_tree(res.name, url), 
                moncms_log
            );
            reader.onerror = () => moncms_log('FILELOAD error');
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    }

    async function onclick_createfiledir(event, iso_date_fmt = '0000-00-00', iso_time_fmt = 'T00:00:00')
    {
        await clear(false, event.target.dataset.message);
        const now = new Date().toISOString();
        const time = now.slice(iso_date_fmt.length, iso_date_fmt.length + iso_time_fmt.length).toLowerCase().replaceAll(':', '');
        const date = now.slice(0, iso_date_fmt.length);
        
        const new_path = event.target.dataset.newpath.replaceAll('${date}', date.toString()).replaceAll('${time}', time.toString());
        setFileName(new_path);
        fileNameRef.current.focus();
    }

    async function onclick_delfile(event)
    {
        if(Object.entries(retrieved_contents || {}).length == 0)
        {
            await clear(false);
            setFileName('');
            return btnFileName.focus();
        }
        const prep = github_api_prepare_params(url, token, true);
        if(prep.error)
            return moncms_log(prep.error);
        if(!fileName || !window.confirm(event.target.dataset.message))
            return;

        await github_api_delete_file(prep, retrieved_contents, moncms_log);
        delete_file_tree(fileName);
        setUrl(prep.curdir_url);
        clear(false);
    }

    function onclick_upload()
    {
        const html_files = document.getElementById('html_files');
        const prep = github_api_prepare_params(url, value, true);
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

        if(!fileName)
            return moncms_log('cannot save a file without file name');

        const prep = github_api_prepare_params(url, token, true);
        if(prep.error)
            return moncms_log(prep.error);

        const frontmatter_empty = frontMatterEmpty == true;
        const frontmatter_not_empty = frontMatterEmpty == false;
        const frontmatter_str = format_frontmatter(frontMatter, frontmatter_not_empty);
        
        editorRef.current.read(async () => {
            const imageNodes = $nodesOfType(ImageNode);
            for(const node of imageNodes)
            {
                const src = node.getSrc();
                if(src.startsWith('blob:'))
                {
                    const blob = await fetch(src).then(r => r.blob());
                    const reader = new FileReader();
                    reader.onload = async () => {
                        var datauri = reader.result;
                        const base64 = datauri.split(',')[1];
                        const file_path = 'testfile.png';
                        const res_put = await github_api_create_file(prep, file_path, base64, moncms_log).pop();
                        console.log(src, base64, res_put);
                        node.setSrc(res_put.download_url);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        });

        const text = await window_editor_getMarkdown();
        const base64 = window.btoa(String.fromCodePoint(...(new TextEncoder().encode(frontmatter_str + text)))).replaceAll('\n', '');

        if(retrieved_contents.encoding == 'base64'
            && retrieved_contents.content.replaceAll('\n', '') == base64
            && fileName == retrieved_contents.name
            && frontmatter_empty
            && !frontmatter_str
        )
            return moncms_log('no changes');
        

        const should_rename = retrieved_contents && fileName != retrieved_contents.name;
        const should_update = retrieved_contents && fileName == retrieved_contents.name;
        const should_create = Object.entries(retrieved_contents || {}).length == 0 && fileName;

        if(should_update)
        {
            const res_put = await github_api_update_file(prep, retrieved_contents.sha, base64, moncms_log).pop();
            retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
        }
        else if(should_create)
        {
            const res_put = await github_api_create_file(prep, fileName, base64, moncms_log).pop();
            retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
        }
        else if(should_rename)
        {
            retrieved_contents = await github_api_rename_file(prep, fileName, base64, retrieved_contents, moncms_log);
            rename_file_tree(_retrieved_contents.name, retrieved_contents);
        }
    }

    function update_file_tree(files_and_dirs, curdir_url, parentdir_url, selected_file_name, ext = ['.gif', '.jpg', '.png', '.svg'])
    {
        const key_by_name = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        const files = files_and_dirs.filter(j => j.type == 'file' && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const dirs = files_and_dirs.filter(j => j.type == 'dir' && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const images = files_and_dirs.filter(j => j.type == 'file' && ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const file_tree = [
            { name: '.', type: 'dir', html_url: curdir_url }, 
            { name: '..', type: 'dir', html_url: parentdir_url ? parentdir_url : curdir_url }, 
            ...dirs, 
            ...files, 
            ...images
        ];
        //TODO: add .key: Warning: Each child in a list should have a unique "key" prop: https://reactjs.org/link/warning-keys 
        const file_tree_value = ['', ...file_tree.filter(j => j.name == selected_file_name).map(j => j.html_url)].pop();
        setFileTree(file_tree);
        setFileTreeValue(file_tree_value);
    }

    function add_file_tree(res_name, url)
    {
        setFileTree([...fileTree, { name: res_name, type: 'file', html_url: url }]);
        setFileTreeValue(url);
    }

    function delete_file_tree(selected_file_name)
    {
        //TODO: add some early exit to disallow delete of . and ..
        const file_tree = fileTree.filter(j => j.name != selected_file_name);
        setFileTree(file_tree);
        setFileTreeValue(file_tree.length > 0 ? file_tree[0].html_url : '');
    }

    function rename_file_tree(selected_file_name, retrieved_contents)
    {
        setFileTree(fileTree.map(j => j.name == selected_file_name ? retrieved_contents : j));
        setFileTreeValue(retrieved_contents.html_url);
    }

    async function open_file_or_dir(url_value = '', token_value = '', HTTP_OK = 200, ext = ['.gif', '.jpg', '.png', '.svg'])
    {
        let prep = github_api_prepare_params(url_value, token_value);
        if(prep.error)
        {
            clear();
            return moncms_log(prep.error);
        }
        if(!token_value)
        {
            token_value = cache_load(prep.github_repo_url); // FIXME: set to html_token.value
            prep = github_api_prepare_params(url_value, token_value); 
            if(token_value)
                moncms_log('got from cache for ' + prep.github_repo_url);
        }
        setIsSignedIn(token_value ? true : false);

        let [res_file, res_dir] = await github_api_get_file_dir(prep, moncms_log);
        if(!res_dir) res_dir = []; //FIXME

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
            setFileName('');
            setFileNameTitle('');
            clear();
        }
        else if(is_dir)
        {
            setFrontMatter([{frontmatter_key : '', frontmatter_val : ''}]);
            frontMatterEmpty = true;

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, '');
            setFileName('');
            setFileNameTitle(prep.github_repo_path);
            window_editor_setMarkdown(image_listing);
            window_editor_setEditable(false);
        }
        else if(!is_image)
        {
            let [text, frontmatter] = [res_file.encoding == 'base64' ? new TextDecoder().decode(Uint8Array.from(window.atob(res_file.content), m => m.codePointAt(0))) : res_file.encoding == 'none' ? ('<file too large>') : (res_file.content || ''), {}];
            [text, frontmatter] = parse_frontmatter(text);
            setFrontMatter([{frontmatter_key : '', frontmatter_val : ''}, ...Object.entries(frontmatter || {}).map(([k, v]) => ({frontmatter_key : k, frontmatter_val : v}))]);
            frontMatterEmpty = frontmatter === null;

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, res_file.name);
            setFileName(res_file.name);
            setFileNameTitle(prep.github_repo_path);
            window_editor_setMarkdown(text);
            window_editor_setEditable(true);
        }
        else if(is_image)
        {
            setFrontMatter([{frontmatter_key : '', frontmatter_val : ''}]);
            frontMatterEmpty = true;

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, res_file.name);
            setFileName(res_file.name);
            setFileNameTitle(prep.github_repo_path);
            window_editor_setMarkdown(`# ${res_file.name}\n![${res_file.name}](${res_file.download_url})`);
            window_editor_setMarkdown(`<img src="${res_file.download_url}" height="100px"/>`);

            window_editor_setEditable(false);
        }
    }

    function onchange_frontmatter(name, value, idx)
    {
        setFrontMatter(frontMatter.map((item, i) => i == idx ? {frontmatter_key : (name != 'frontmatter_key' ? item.frontmatter_key : value), frontmatter_val: (name != 'frontmatter_val' ? item.frontmatter_val : value)} : item));
    }

    function onclick_frontmatter_delrow(event)
    {
        const idx = event.target.parentElement.parentElement.rowIndex;
        setFrontMatter(frontMatter.map((item, i) => (i == 0 && idx == 0) ? {frontmatter_key : '', frontmatter_val : ''} : item).filter((item, i) => idx == 0 || i != idx));
    }

    function onclick_frontmatter_addrow(event)
    {
        const idx = event.target.parentElement.parentElement.rowIndex;
        if(idx == 0)
            setFrontMatter([{frontmatter_key: '', frontmatter_val: ''}, ...frontMatter]);
        else if(idx < frontMatter.length - 1)
            setFrontMatter([...frontMatter.slice(0, idx + 1), {frontmatter_key : '', frontmatter_val: ''}, ...frontMatter.slice(idx + 1)]);
        else
            setFrontMatter([...frontMatter, {frontmatter_key: '', frontmatter_val: ''}]);
    }

    async function onclick_signinout()
    {
        if(!isSignedIn)
        {
            if(!token)
                return moncms_log('cannot signin, no token provided');

            const prep = github_api_prepare_params(url, token);
            if(!prep.github_repo_url || prep.error)
            {
                if(!prep.error) moncms_log(prep.error);
                return;
            }

            cache_save(prep.github_repo_url, null);

            if(await github_api_signin(prep, moncms_log))
            {
                cache_save(prep.github_repo_url, token);
                setIsSignedIn(true);
                moncms_log('saved to cache for ' + prep.github_repo_url);
                open_file_or_dir(url, token);
            }
            else
                clear();
        }
        else if(isSignedIn)
        {
            clear();
            setToken('');
            setIsSignedIn(false);
            
            const prep = github_api_prepare_params(url);
            if(prep.github_repo_url)
            {
                cache_save(prep.github_repo_url, null);
                moncms_log('cleared and purged cache for ' + prep.github_repo_url);
            }
        }
    }
  
  //const placeholder = 'Enter some rich text...';
  // aria-placeholder={placeholder} placeholder={<div className="editor-placeholder">{placeholder}</div>} 
  return (
    <>
    <input placeholder="GitHub or public URL:" title="GitHub or public URL:" id="html_url" ref={urlRef} type="text" value={url} onChange={(event) => setUrl(event.target.value)}  onKeyPress={(event) => event.code == 'Enter' && open_file_or_dir(url, token)} />
    <input  hidden={isCompact} id="html_token" placeholder="GitHub token:"  type="text" value={token} onChange={(event) => setToken(event.target.value)} onKeyPress={(event) => event.code == 'Enter' && open_file_or_dir(url, token)} />
    <input  hidden={isCompact} id="html_file_name" placeholder="File name:" type="text" ref={fileNameRef} value={fileName} title={fileNameTitle} onChange={(event) => setFileName(event.target.value)}  onKeyPress={(event) => event.code == 'Enter' && onclick_savefile()} />
    <input  hidden={isCompact} id="html_log" placeholder="Log:" title="Log:" value={log} readOnly />
    <select hidden={isCompact} id="html_file_tree" size="10" value={fileTreeValue} onChange={(event) => setFileTreeValue(event.target.value)} onKeyPress={(event) => (event.code == 'Space' || event.code == 'Enter') ? [setUrl(fileTreeValue), open_file_or_dir(fileTreeValue, token)] : []} onDoubleClick={(event) => [setUrl(fileTreeValue), open_file_or_dir(fileTreeValue, token)]}>
        {fileTree.map((f, i) => (<option key={i} value={f.html_url} title={f.html_url}>{f.name + (f.type == 'dir' ? '/' : '')}</option>))}
    </select>
    <table  hidden={isCompact} id="html_frontmatter">
        <tbody>
            {frontMatter.map(({frontmatter_key, frontmatter_val}, i) => (
                <tr key={i}>
                    <td><input type="text" name="frontmatter_key" placeholder="Frontmatter key:"   value={frontmatter_key} onChange={(event) => onchange_frontmatter(event.target.name, event.target.value, i)} /></td>
                    <td><input type="text" name="frontmatter_val" placeholder="Frontmatter value:" value={frontmatter_val} onChange={(event) => onchange_frontmatter(event.target.name, event.target.value, i)} /></td>
                    <td>
                        <button onClick={onclick_frontmatter_addrow}>Add another row</button>
                        <button onClick={onclick_frontmatter_delrow}>Delete this row</button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>

    <button onClick={() => open_file_or_dir(url, token)}>Open</button>
    <button onClick={onclick_savefile}>Save File</button>
    <button onClick={onclick_delfile} id="html_delfile" data-message="Do you really want to delete this file?">Delete File</button>
    <button onClick={onclick_createfiledir} id="html_createfile" data-newpath="${date}-new-post-draft-a${time}.md" data-message="### modify the file name, modify this content and click Save to actually create and save the file">New File</button>
    <button onClick={onclick_createfiledir} id="html_createdir" data-newpath="new-dir-a${time}/.gitignore" data-message="### modify the directory name, and then click Save to create the file and the directory">New Folder</button>
      
    <button onClick={onclick_upload}>Upload Files</button>
    <input type="file" id="html_files" onChange={onchange_files} multiple hidden />
      
    <button onClick={(event) => {setUrl(event.target.dataset.message); setToken(''); open_file_or_dir(event.target.dataset.message, '');}} data-message="https://github.com/vadimkantorov/moncms/blob/master/README.md">Help</button>
    <button onClick={onclick_signinout} className={isSignedIn ? "signout" : "signin"} ></button>
    <button onClick={() => setIsCompact(!isCompact)}>Toggle Compact View</button>
    <div className="editor-shell">
    <LexicalComposer initialConfig={editorConfig}>
      <EditorRefPlugin editorRef={editorRef} />
      <div className="editor-container">
        <ToolbarPlugin />
        <ImagesPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
        </div>
      </div>
    </LexicalComposer>
    </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render
(<div className="App"><App /></div>);
//(<React.StrictMode><div className="App"><App /></div></React.StrictMode>);
