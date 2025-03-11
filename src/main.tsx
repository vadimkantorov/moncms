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
import {ImageCacheContext, ImageCache} from './plugins/ImagesPlugin';

import ToolbarPlugin from './plugins/ToolbarPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';

import {parseAllowedColor, parseAllowedFontSize} from './styleConfig';

import { Octokit } from "@octokit/rest";

export function join2(path1 : string, path2: string): string
{
    const path1_ = path1[path1.length - 1] == '/' ? path1.slice(0, path1.length - 1) : path1;
    const _path2 = path2[0] == '/' ? path2.substring(1) : path2;
    return (path1 && path2) ? (path1_ + '/' + _path2) : (path1 && !path2) ? path1 : (!path1 && path2) ? path2 : '';
}

export function dirname(path : string) : string
{
    if (!path)
        return '';
    return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
}

export function github_api_format_error(resp, res = {})
{
    const resp_status = resp.status || '000';
    const res_message = (res || {}).message || '';
    return `${resp_status}: ` + ({200: 'OK', 201: 'OK Created', 404: 'Resource not found', 409: 'Conflict', 422: 'Already Exists. Validation failed, or the endpoint has been spammed.', 401: 'Unauthorized', 500 : 'Internal Server Error', 403: 'Forbidden: ' + res_message}[resp_status] || '');
}

export function github_api_prepare_params(github_url : String, github_token : String = '', must_have_token : boolean = false) : Object
{
    const prep = {
        headers: {},
        error: '',

        github_token: '',
        github_owner: '',
        github_repo: '',
        github_path: '',
        github_path_dir: '',
        github_branch: '',

        github_repo_url: '',

        contents_api_url_get: '',
        contents_api_url_put: '',
        contents_api_dir_url_put: '',
        contents_api_dir_url_get: '',
        curdir_url: '',
        parentdir_url: '',

        prefix: ''
    };
    if (!github_url) {
        prep.error = 'no github_url provided';
        return prep;
    }
    if (must_have_token && !github_token) {
        prep.error = 'no github_token provided';
        return prep;
    }

    // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
    const github_url_normalized = github_url.replace('https://raw.githubusercontent.com', 'https://github.com');

    let github_owner = '', github_repo = '', github_repo_tag = '', github_repo_file_path = '', github_repo_dir_path = '';

    const m1 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/blob\/(.+?)\/(.+)/i);
    const m2 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/tree\/(.+?)\/(.+)/i);
    const m3 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/tree\/(.+)/i);
    const m4 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/?/i);
    const m5 = github_url_normalized.match(/https:\/\/(.+)\.github.io\/(.+)\/?/i);
    const m6 = github_url_normalized.match(/https:\/\/(.+)\.github.io\/?/i);

    if (m1)
        [, github_owner, github_repo, github_repo_tag, github_repo_file_path] = m1;
    else if (m2)
        [, github_owner, github_repo, github_repo_tag, github_repo_dir_path] = m2;
    else if (m3)
        [, github_owner, github_repo, github_repo_tag] = m3;
    else if (m4)
        [, github_owner, github_repo] = m4;
    else if (m5)
        [, github_owner, github_repo] = m5;
    else if (m6)
        [github_owner, github_repo] = m6[1], (m6[1] + '.github.io');

    else {
        prep.error = 'github_url could not be matched';
        return prep;
    }
    github_repo = github_repo.replace(/\/$/g, '');
    github_repo_dir_path = github_repo_dir_path.replace(/\/$/g, '');
    github_repo_tag = github_repo_tag.replace(/\/$/g, '');

    const github_path = github_repo_file_path || github_repo_dir_path;
    const github_repo_parent_path = !github_path ? '' : github_path.includes('/') ? dirname(github_path) : '';

    prep.github_token = github_token;
    prep.github_owner = github_owner;
    prep.github_repo = github_repo;
    prep.github_path = github_path;
    prep.github_branch = github_repo_tag;
    prep.github_path_dir = github_repo_dir_path ? github_repo_dir_path : github_repo_parent_path;
    prep.github_repo_url = `https://github.com/${github_owner}/${github_repo}`;
    prep.contents_api_url_get = `https://api.github.com/repos/${github_owner}/${github_repo}/contents/${github_path}` + (github_repo_tag ? `?ref=${github_repo_tag}` : '');
    prep.contents_api_url_put = `https://api.github.com/repos/${github_owner}/${github_repo}/contents/${github_path}`;
    prep.contents_api_dir_url_put = github_repo_dir_path ? prep.contents_api_url_put : `https://api.github.com/repos/${github_owner}/${github_repo}/contents/${dirname(github_path)}`;

    prep.contents_api_dir_url_get = github_repo_dir_path ? prep.contents_api_url_get : (`https://api.github.com/repos/${github_owner}/${github_repo}/contents/${github_repo_parent_path}` + (github_repo_tag ? `?ref=${github_repo_tag}` : ''));

    const slashIdx2 = github_path.lastIndexOf('/');
    const slashIdx1 = github_path.slice(0, slashIdx2).lastIndexOf('/');

    const github_repo_curdir_path = github_repo_dir_path ? github_path : github_repo_file_path ? (slashIdx2 != -1 ? github_path.slice(0, slashIdx2) : '') : null;

    const github_repo_parentdir_path = github_repo_dir_path ? (slashIdx2 != -1 ? github_path.slice(0, slashIdx2) : '') : github_repo_file_path ? ((slashIdx2 != -1 && slashIdx1 != -1) ? github_path.slice(0, slashIdx1) : (slashIdx2 != -1 && slashIdx1 == -1) ? '' : null) : null;

    prep.curdir_url = `https://github.com/${github_owner}/${github_repo}/tree/${github_repo_tag}/${github_repo_curdir_path || ""}`;
    prep.parentdir_url = github_repo_parentdir_path != null ? `https://github.com/${github_owner}/${github_repo}/tree/${github_repo_tag}/${github_repo_parentdir_path}` : prep.curdir_url;

    prep.prefix_without_branch = `https://raw.githubusercontent.com/${github_owner}/${github_repo}`;
    // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
    prep.headers = {
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json',
        'If-None-Match': '',
        'Authorization': github_token ? `Bearer ${github_token}` : ''
    };

    return prep;
}

export async function github_api_signin(prep, log)
{
    const octokit = new Octokit({auth: prep.github_token});
    try
    {
        const resp_get = await octokit.rest.repos.get({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_repo_url, ref: prep.github_branch});
        const res_get = resp_get.data;
        log('github_api_signin: OK');
        return res_get.default_branch;
    }
    catch
    {
        log('github_api_signin: error');
        return '';
    }
    return '';
}

export async function github_api_delete_file(prep, sha, log, message = 'no commit message', HTTP_OK = 200)
{
    const octokit = new Octokit({auth: prep.github_token});

    try
    {
        const resp_del = await octokit.rest.repos.deleteFile({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path, ref: prep.github_branch, message : message, sha : sha});
        log('github_api_delete_file: ok');
        return resp_del.status == HTTP_OK;
    }
    catch
    {
        log('github_api_delete_file: error');
        return false;
    }
    return false;
}

export async function github_api_get_file_dir(prep, log, default_file_name = 'README.md')
{
    const octokit = new Octokit({auth: prep.github_token});

    let resp_file = {}, resp_dir = {}, res_file = {}, res_dir = [];
    try
    {   
        if(prep.github_path != prep.github_path_dir)
        {
            resp_file = await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path, ref: prep.github_branch});
            resp_dir = await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path_dir, ref: prep.github_branch});
            [res_file, res_dir] = [resp_file.data, resp_dir.data];
        }
        else
        {
            resp_dir = await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path_dir, ref: prep.github_branch});
            const github_path = [''].concat(res_dir.filter(j => j.name.toLowerCase() == default_file_name.toLowerCase()).map(j => j.path)).pop();
            resp_file = github_path ? (await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: github_path, ref: prep.github_branch})) : {data : []};
            [res_file, res_dir] = [resp_file.data, resp_dir.data];
        }
    }
    catch
    {
        log('error: github_api_get_file_dir');
        [res_file, res_dir] = [{}, []];
    }
    
    return [({name : res_file.name, type : res_file.type, content : res_file.content, sha : res_file.sha, encoding: res_file.encoding, download_url : res_file.download_url, url : decodeURI(res_file.html_url)}), res_dir.map(f => ({name : f.name, type : f.type, encoding : f.encoding, content : f.content, sha : f.sha, download_url : f.download_url, url : decodeURI(f.html_url)}))];
}

export async function github_api_upsert_file(prep, new_file_name, base64, sha, add_file_tree, log, message = 'no commit message', HTTP_CREATED = 201, HTTP_EXISTS = 422)
{
    const octokit = new Octokit({auth: prep.github_token});
    const github_path = new_file_name;
    const resp_put = await octokit.rest.repos.createOrUpdateFileContents({owner: prep.github_owner, repo : prep.github_repo, path: github_path, branch: prep.github_branch, message : message, content: base64, sha : sha});
    const res_put = resp_put.data;

    if(resp_put.status == HTTP_CREATED && add_file_tree != null)
        add_file_tree(res_put.content);

    return res_put.content;
}

export async function github_api_rename_file(prep, new_file_name, base64, retrieved_contents_sha, log, message = 'no commit message')
{
    const [resp_put, res_put] = await github_api_upsert_file({...prep, contents_api_url_put : join2(prep.contents_api_dir_url_put, new_file_name)}, null, base64, log);
    const retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
    const res_del = await github_api_delete_file(prep, retrieved_contents_sha, log);
    return retrieved_contents;
}

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

function fmt_upload_path(basename: string)
{
    const now = new Date().toISOString();
    const yyyy = now.slice(0, 4);
    const mm = now.slice(5, 7);

    return `/moncms-content/uploads/${yyyy}/${mm}/${basename}`;
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

function format_frontmatter(frontMatter : Array, frontMatterEmpty : boolean) : string
{
    const frontmatter_str_inside = frontMatter.filter(({frontmatter_key, frontmatter_val}) => frontmatter_key != '' || frontmatter_val != '').map(({frontmatter_key, frontmatter_val}) => `${frontmatter_key}: "${frontmatter_val}"`).join('\n');
    const frontmatter_str = `---\n${frontmatter_str_inside}\n---\n\n`;
    return (frontmatter_str_inside || !frontMatterEmpty) ? frontmatter_str : '';
}

function newrow_frontmatter()
{
    return {frontmatter_id: self.crypto.randomUUID(), frontmatter_key: '', frontmatter_val: ''};
}

function encode_string_as_base64(str:string): string
{
    const uint8array = new TextEncoder().encode(str);
    //return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',').pop()); reader.readAsDataURL(new Blob(uint8array)); });
    return window.btoa(String.fromCodePoint(...( uint8array ))).replaceAll('\n', '');
}

async function upload_image_from_bloburl(prep, bloburl, imageCache, log)
{
    const basename = decodeURI(new URL(bloburl).hash).substring(1);
    const upload_path = fmt_upload_path(basename);
    const datauri = imageCache.resolve(bloburl);
    const base64 = datauri.split(',').pop();
    const res_put = await github_api_upsert_file(prep, upload_path, base64, null, null, log);
    const src_new = res_put.download_url === undefined ? upload_path : res_put.download_url;
    imageCache.put(src_new, bloburl);
    return src_new;
}

const imageCache = new ImageCache();

function App() {
    let url_value = '', token_value = '', log_value = '';

    const meta_key = 'moncmsdefault';

    if(window.location.search)
    {
        const query_string = new URLSearchParams(window.location.search);
        if(query_string.has('github_url'))
            url_value = query_string.get('github_url');
        if(query_string.has('github_token'))
            token_value = query_string.get('github_token');
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
    const [frontMatter, setFrontMatter] = useState([newrow_frontmatter()]);
    const [frontMatterEmpty, setFrontMatterEmpty] = useState(true);

    const [curFile, setCurFile] = useState({});
    const [fileTree, setFileTree] = useState([]);
    const [fileTreeValue, setFileTreeValue] = useState('');

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
        if(url)
            open_file_or_dir(url, token);
        else
            urlRef.current.focus();
    }, []);

    function moncms_log(text : string)
    {
        setLog(fmt_log(text));
    }

    function clear(markdown = '', file_tree = true, front_matter = true)
    {
        setCurFile({});
        setFileName('');
        if(file_tree)
            setFileTree([]);
        if(front_matter)
            setFrontMatter([newrow_frontmatter()]);
        
        editorRef.current?.update(() => {
            const editorState = editorRef.current?.getEditorState();
            if (editorState != null) {
                $convertFromMarkdownString(markdown, PLAYGROUND_TRANSFORMERS);
                $getRoot().selectStart();
            }
        });
    }

    function onchange_files(event)
    {
        // https://stackoverflow.com/questions/572768/styling-an-input-type-file-button/25825731#25825731
        for(const file of event.target.files)
        {
            const new_file_name = file.name;
            const reader = new FileReader();
            reader.onload = () => github_api_upsert_file(
                prep, 
                new_file_name, 
                reader.result.split(',').pop(),
                null,
                res => add_file_tree(res.name, url), 
                moncms_log
            );
            reader.onerror = () => moncms_log('FILELOAD error');
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    }

    async function onclick_createfiledir(event, iso_date_fmt = '0000-00-00', iso_time_fmt = 'T00:00:00')
    {
        const now = new Date().toISOString();
        const time = now.slice(iso_date_fmt.length, iso_date_fmt.length + iso_time_fmt.length).toLowerCase().replaceAll(':', '');
        const date = now.slice(0, iso_date_fmt.length);
        
        const new_path = event.target.dataset.newpath.replaceAll('${date}', date.toString()).replaceAll('${time}', time.toString());
        setFileName(new_path);
        clear(event.target.dataset.message, false, true);
        fileNameRef.current.focus();
    }

    async function onclick_delfile(event)
    {
        //TODO: bail out for directories?

        if(Object.entries(curFile || {}).length == 0)
        {
            clear('', false, true);
            setFileName('');
            return;
        }
        if(!fileName || (fileName == '.' || fileName == '..' || fileName == './' || fileName == '../'))
            return;

        const prep = github_api_prepare_params(url, token, true);
        if(prep.error)
            return moncms_log(prep.error);
        if(!window.confirm(event.target.dataset.message))
            return;

        await github_api_delete_file(prep, curFile.sha, moncms_log);
        delete_file_tree(fileName);
        setUrl(prep.curdir_url);
        clear('', false, true);
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
        const frontmatter_str = format_frontmatter(frontMatter, frontmatter_empty);
        
        let [markdown, imageNodes] = await new Promise(resolve => editorRef.current.read(() => {
            let markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
            const imageNodes = $nodesOfType(ImageNode);
            resolve([markdown, imageNodes]);
        }));

        let replace_map = {};
        for(const node of imageNodes)
        {
            const src = node.getSrc();
            if(src.startsWith('blob:'))
            {
                const src_new = await upload_image_from_bloburl(prep, src, imageCache, moncms_log);
                editorRef.current.update(() => node.getWritable().setSrc(src_new));
                replace_map[src] = src_new;

            }
        }
        for(const [src, src_new] of Object.entries(replace_map))
            markdown = markdown.replaceAll(src, src_new);

        const base64 = encode_string_as_base64(frontmatter_str + markdown);

        if(curFile.encoding == 'base64'
            && curFile.content.replaceAll('\n', '') == base64
            && fileName == curFile.name
            && frontmatter_empty
            && !frontmatter_str
        )
            return moncms_log('no changes');

        const should_rename = Object.entries(curFile || {}).length != 0 && fileName != curFile.name;
        const should_update = Object.entries(curFile || {}).length != 0 && fileName == curFile.name;
        const should_create = Object.entries(curFile || {}).length == 0 && fileName;

        if(should_update || should_create)
        {
            const res_put = await github_api_upsert_file(prep, fileName, base64, curFile.sha, null, moncms_log);
            setCurFile({encoding: 'base64', content : base64, ...res_put.content});
        }
        else if(should_rename)
        {
            const res_put = await github_api_rename_file(prep, fileName, base64, curFile, moncms_log);
            setCurFile(res_put);
            rename_file_tree(curFile.name, curFile);
        }
    }

    function update_file_tree(files_and_dirs, curdir_url, parentdir_url, selected_file_name, ext = ['.gif', '.jpg', '.png', '.svg'])
    {
        const key_by_name = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        const files = files_and_dirs.filter(j => j.type == 'file' && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const dirs = files_and_dirs.filter(j => j.type == 'dir' && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const images = files_and_dirs.filter(j => j.type == 'file' && ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const file_tree = [
            { name: '.', type: 'dir', url: curdir_url }, 
            { name: '..', type: 'dir', url: parentdir_url ? parentdir_url : curdir_url }, 
            ...dirs, 
            ...files, 
            ...images
        ];
        const file_tree_value = ['', ...file_tree.filter(j => j.name == selected_file_name).map(j => j.url)].pop();
        setFileTree(file_tree);
        setFileTreeValue(file_tree_value);
    }

    function add_file_tree(file_name, url)
    {
        setFileTree([...fileTree, { name: file_name, type: 'file', url: url }]);
        setFileTreeValue(url);
    }

    function delete_file_tree(selected_file_name)
    {
        const file_tree = fileTree.filter(j => j.name != selected_file_name);
        setFileTree(file_tree);
        setFileTreeValue(file_tree.length > 0 ? file_tree[0].url : '');
    }

    function rename_file_tree(selected_file_name, curFile)
    {
        setFileTree(fileTree.map(j => j.name == selected_file_name ? curFile : j));
        setFileTreeValue(curFile.url);
    }

    async function open_file_or_dir(url_value = '', token_value = '', HTTP_OK = 200, ext = ['.gif', '.jpg', '.png', '.svg'])
    {
        let prep = github_api_prepare_params(url_value, token_value);
        if(prep.error)
        {
            clear('', true, true);
            return moncms_log(prep.error);
        }
        if(!token_value)
        {
            token_value = cache_load(prep.github_repo_url); // FIXME: set to html_token.value
            prep = github_api_prepare_params(url_value, token_value); 
            if(token_value)
            {
                setIsSignedIn(true);
                moncms_log('got from cache for ' + prep.github_repo_url);
            }
        }
        else if(cache_load(prep.github_repo_url) != '')
        {
            setIsSignedIn(true);
            moncms_log('found in cache for ' + prep.github_repo_url);
        }
        
        if(!prep.github_branch)
            prep.github_branch = await github_api_signin(prep, moncms_log);

        let [res_file, res_dir] = await github_api_get_file_dir(prep, moncms_log);
        imageCache.prefix = prep.prefix_without_branch + '/' + prep.github_branch;

        const key_by_name = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        const is_dir = res_file.content === undefined;
        const is_err = Object.entries(res_file).length == 0 && res_dir.length == 0;
        const is_image = !is_dir && ext.some(e => res_file.name.endsWith(e));
        const images = res_dir.filter(j =>j.type == 'file' && ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const image_listing = is_image ? `# ${res_file.name}\n![${res_file.name}](${res_file.download_url})` : images.map(j => `# ${j.name}\n![${j.name}](${j.download_url})`).join('\n\n');
            
        setCurFile(res_file);
        
        if(is_err)
        {
            setFileName('');
            setFileNameTitle('');
            clear('', true, true);
        }
        else if(is_dir)
        {
            setFrontMatter([newrow_frontmatter()]);
            setFrontMatterEmpty(true);

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, '');
            setFileName('');
            setFileNameTitle(prep.github_path);
            editorRef.current.update(() => {
                const editorState = editorRef.current.getEditorState();
                if (editorState != null) {
                    $convertFromMarkdownString(image_listing, PLAYGROUND_TRANSFORMERS);
                    $getRoot().selectStart();
                }
            });
            editorRef.current.setEditable(false);
        }
        else if(is_image)
        {
            setFrontMatter([newrow_frontmatter()]);
            setFrontMatterEmpty(true);

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, res_file.name);
            setFileName(res_file.name);
            setFileNameTitle(prep.github_path);
            editorRef.current.update(() => {
                const editorState = editorRef.current.getEditorState();
                if (editorState != null) {
                    $convertFromMarkdownString(image_listing, PLAYGROUND_TRANSFORMERS);
                    $getRoot().selectStart();
                }
            });
            editorRef.current.setEditable(false);
        }
        else if(!is_image)
        {
            let [text, frontmatter] = [res_file.encoding == 'base64' ? new TextDecoder().decode(Uint8Array.from(window.atob(res_file.content), m => m.codePointAt(0))) : res_file.encoding == 'none' ? ('<file too large>') : (res_file.content || ''), {}];
            [text, frontmatter] = parse_frontmatter(text);
            setFrontMatter([newrow_frontmatter(), ...Object.entries(frontmatter || {}).map(([k, v]) => ({frontmatter_key : k, frontmatter_val : v}))]);
            setFrontMatterEmpty(frontmatter === null);

            update_file_tree(res_dir, prep.curdir_url, prep.parentdir_url, res_file.name);
            setFileName(res_file.name);
            setFileNameTitle(prep.github_path);
            editorRef.current.update(() => {
                const editorState = editorRef.current.getEditorState();
                if (editorState != null) {
                    $convertFromMarkdownString(text, PLAYGROUND_TRANSFORMERS);
                    $getRoot().selectStart();
                }
            });
            editorRef.current.setEditable(true);
        }
    }

    function onchange_frontmatter(name, value, idx)
    {
        setFrontMatter(frontMatter.map((item, i) => i == idx ? {...item, [name] : value} : item));
    }

    function onclick_frontmatter_delrow(event)
    {
        const idx = event.target.parentElement.parentElement.rowIndex;
        setFrontMatter(frontMatter.map((item, i) => (i == 0 && idx == 0) ? {...item, frontmatter_key : '', frontmatter_val : ''} : item).filter((item, i) => idx == 0 || i != idx));
    }

    function onclick_frontmatter_addrow(event)
    {
        const idx = event.target.parentElement.parentElement.rowIndex;
        if(idx == 0)
            setFrontMatter([newrow_frontmatter(), ...frontMatter]);
        else if(idx < frontMatter.length - 1)
            setFrontMatter([...frontMatter.slice(0, idx + 1), newrow_frontmatter(), ...frontMatter.slice(idx + 1)]);
        else
            setFrontMatter([...frontMatter, newrow_frontmatter()]);
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
                clear('', true, true);
        }
        else if(isSignedIn)
        {
            clear('', true, true);
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
  
  return (
    <>
    <input placeholder="GitHub or public URL:" title="GitHub or public URL:" id="html_url" ref={urlRef} type="text" value={url} onChange={(event) => setUrl(event.target.value)}  onKeyPress={(event) => event.code == 'Enter' && open_file_or_dir(url, token)} />
    <input  hidden={isCompact} id="html_token" placeholder="GitHub token:"  type="text" value={token} onChange={(event) => setToken(event.target.value)} onKeyPress={(event) => event.code == 'Enter' && open_file_or_dir(url, token)} />
    <input  hidden={isCompact} id="html_file_name" placeholder="File name:" type="text" ref={fileNameRef} value={fileName} title={fileNameTitle} onChange={(event) => setFileName(event.target.value)}  onKeyPress={(event) => event.code == 'Enter' && onclick_savefile()} />
    <input  hidden={isCompact} id="html_log" placeholder="Log:" title="Log:" value={log} readOnly />
    <select hidden={isCompact} id="html_file_tree" size="10" value={fileTreeValue} onChange={(event) => setFileTreeValue(event.target.value)} onKeyPress={(event) => (event.code == 'Space' || event.code == 'Enter') ? [setUrl(fileTreeValue), open_file_or_dir(fileTreeValue, token)] : []} onDoubleClick={(event) => [setUrl(fileTreeValue), open_file_or_dir(fileTreeValue, token)]}>
        {fileTree.map((f, i) => (<option key={f.name + ':' + f.url} value={f.url} title={f.url}>{f.name + (f.type == 'dir' ? '/' : '')}</option>))}
    </select>
    <table  hidden={isCompact} id="html_frontmatter">
        <tbody>
            {frontMatter.map(({frontmatter_key, frontmatter_val, frontmatter_id}, i) => (
                <tr key={frontmatter_id}>
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
    <div id="moncms_toolbar">
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
    </div>
    <div className="editor-shell">
    <ImageCacheContext.Provider value={imageCache}><LexicalComposer initialConfig={editorConfig}>
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
    </LexicalComposer></ImageCacheContext.Provider>
    </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render
(<div className="App"><App /></div>);
//(<React.StrictMode><div className="App"><App /></div></React.StrictMode>);
