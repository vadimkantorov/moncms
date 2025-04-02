// @ts-nocheck

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { Octokit } from "@octokit/rest";
import { parse, stringify, YAMLError } from "yaml";
import Prism from "prismjs"; if (typeof globalThis.Prism === 'undefined') { globalThis.Prism = Prism;}

import '../assets/styles.css';

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

import {EditorState, $getRoot, $createParagraphNode, $createTextNode, $isTextNode, $nodesOfType, DOMConversionMap, DOMExportOutput, DOMExportOutputMap, isHTMLElement, Klass, LexicalEditor} from 'lexical';
import {EditorRefPlugin} from "@lexical/react/LexicalEditorRefPlugin";
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {HorizontalRulePlugin} from '@lexical/react/LexicalHorizontalRulePlugin';
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';

import {ImageCacheContext, ImageCache} from './plugins/ImagesPlugin';
import LexicalAutoLinkPlugin from './plugins/AutoLinkPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import ShortcutsPlugin from './plugins/ShortcutsPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import {PLAYGROUND_TRANSFORMERS} from './plugins/MarkdownTransformers';

import {LexicalNode, ParagraphNode, TextNode} from 'lexical';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { CodeNode } from '@lexical/code';
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { HashtagNode } from "@lexical/hashtag";
import { ListNode, ListItemNode } from "@lexical/list";
import { ImageNode } from './nodes/ImageNode';
import { ToolbarContext } from "./context/ToolbarContext";

const imageCache = new ImageCache();

const moncms_prefix = 'moncms';

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
    namespace: moncms_prefix,
    nodes: [ParagraphNode, TextNode, HeadingNode, ListNode, ListItemNode, CodeNode, ImageNode, HorizontalRuleNode, LinkNode, AutoLinkNode],
    onError(error: Error) { throw error; },
};

export function github_api_format_error(resp, HTTP_OK = 200, HTTP_CREATED = 201)
{
    const status = resp.status || '000';
    const message = ((resp?.response?.data?.message) || ((resp?.message || '') + (resp?.stack || '')) ||'').replaceAll('\n', ' ');
    return ([HTTP_OK, HTTP_CREATED].includes(status) ? ' ok ' : ' error ') + `| ${status} | ` + ({200: 'OK', 201: 'OK Created', 404: 'Resource not found', 409: 'Conflict', 422: 'Already Exists. Validation failed, or the endpoint has been spammed.', 401: 'Unauthorized', 500 : 'Internal Server Error', 403: 'Forbidden: '}[status] || '') + ' | ' + message;
}

export function github_api_prepare_params(github_url : String, github_token : String = '', must_have_token : boolean = false) : Object
{
    const prep = {
        error: '',
        headers: {'If-None-Match': ''},

        github_token: '',
        github_owner: '',
        github_repo: '',
        github_branch: '',

        github_path: '',
        github_path_dir: '',

        github_repo_url: '',
        github_repo_curdir_path : '',
        github_repo_parentdir_path : '',

        curdir_url: () => '',
        parentdir_url: () => '',
        prefix : () => ''
    };
    if (!github_url) {
        prep.error = 'no github_url provided';
        return prep;
    }
    if (must_have_token && !github_token) {
        prep.error = 'no github_token provided';
        return prep;
    }

    // TODO: make work for new format: https://raw.githubusercontent.com/vadimkantorov/moncmsblog/refs/heads/master/README.md
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

    if((!github_owner) || (!github_repo))
    {
        prep.error = "github_owner or github_repo could not be extracted";
        return prep;
    }

    const dirname = path => (!path) ? '' : (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

    const github_path = github_repo_file_path || github_repo_dir_path;
    const github_repo_parent_path = !github_path ? '' : github_path.includes('/') ? dirname(github_path) : '';
    const slashIdx2 = github_path.lastIndexOf('/');
    const slashIdx1 = github_path.slice(0, slashIdx2).lastIndexOf('/');

    prep.github_token = github_token;
    prep.github_owner = github_owner;
    prep.github_repo = github_repo;
    prep.github_path = github_path;
    prep.github_branch = github_repo_tag;
    prep.github_path_dir = github_repo_dir_path ? github_repo_dir_path : github_repo_parent_path;
    prep.github_repo_url = `https://github.com/${github_owner}/${github_repo}`;
    prep.github_repo_curdir_path = github_repo_dir_path ? github_path : github_repo_file_path ? (slashIdx2 != -1 ? github_path.slice(0, slashIdx2) : '') : null;
    prep.github_repo_parentdir_path = github_repo_dir_path ? (slashIdx2 != -1 ? github_path.slice(0, slashIdx2) : '') : github_repo_file_path ? ((slashIdx2 != -1 && slashIdx1 != -1) ? github_path.slice(0, slashIdx1) : (slashIdx2 != -1 && slashIdx1 == -1) ? '' : null) : null;

    prep.curdir_url = () => prep.github_branch ? `${prep.github_repo_url}/tree/${prep.github_branch}/${prep.github_repo_curdir_path || ""}` : prep.github_repo_url;
    prep.parentdir_url = () => prep.github_repo_parentdir_path != null ? (prep.github_branch ? `${prep.github_repo_url}/tree/${prep.github_branch}/${prep.github_repo_parentdir_path}` : prep.github_repo_url) : prep.curdir_url();
    prep.prefix = () => `https://raw.githubusercontent.com/${prep.github_owner}/${prep.github_repo}/${prep.github_branch}`;

    return prep;
}

export async function github_api_signin(prep, log)
{
    let res_get = '';
    try
    {
        const octokit = new Octokit({auth: prep.github_token});
        const resp_get = await octokit.rest.repos.get({owner: prep.github_owner, repo : prep.github_repo, ref: prep.github_branch});
        res_get = resp_get.data.default_branch;
        log('github_api_signin:' + github_api_format_error(resp_get));
    }
    catch(exc)
    {
        log('github_api_signin:' + github_api_format_error(exc));
        res_get = '';
    }
    return '';
}

export async function github_api_delete_file(prep, sha, log, message = 'no commit message', HTTP_OK = 200)
{
    let res_del = false;
    try
    {
        const octokit = new Octokit({auth: prep.github_token});
        const resp_del = await octokit.rest.repos.deleteFile({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path, ref: prep.github_branch, message : message, sha : sha});
        res_del = resp_del.status == HTTP_OK;
        log('github_api_delete_file:' + github_api_format_error(resp_del));
    }
    catch(exc)
    {
        log('github_api_delete_file:' + github_api_format_error(exc));
        res_del = false;
    }
    return res_del;
}

export async function github_api_get_file_and_dir(prep, log, default_file_name = 'README.md')
{
    let res_file = {}, res_dir = [], resp_file = {}, resp_dir = {};
    try
    {   
        const octokit = new Octokit({auth: prep.github_token});
        if(prep.github_path != prep.github_path_dir)
        {
            resp_file = await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path, ref: prep.github_branch, headers : prep.headers});
            resp_dir = await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path_dir, ref: prep.github_branch, headers : prep.headers});
            [res_file, res_dir] = [resp_file.data, resp_dir.data];
        }
        else
        {
            resp_dir = await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path_dir, ref: prep.github_branch, headers : prep.headers});
            res_dir = resp_dir.data;
            const github_path = res_dir.filter(j => j.name.toLowerCase() == default_file_name.toLowerCase()).map(j => j.path).pop() || '';
            resp_file = github_path ? (await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: github_path, ref: prep.github_branch, headers : prep.headers})) : {data : []};
            [res_file, res_dir] = [resp_file.data, resp_dir.data];
        }
        log('github_api_get_file_and_dir: | file: ' + github_api_format_error(resp_file) + ' | dir: ' + github_api_format_error(resp_dir));
    }
    catch(exc)
    {
        log('github_api_get_file_and_dir:' + github_api_format_error(exc));
        [res_file, res_dir] = [{}, []];
    }
    
    return [(Object.entries(res_file).length != 0 ? ({name : res_file.name, type : res_file.type, content : res_file.content, sha : res_file.sha, encoding: res_file.encoding, download_url : res_file.download_url, url : decodeURI(res_file.html_url)}) : {}), res_dir.map(f => ({name : f.name, type : f.type, url : decodeURI(f.html_url)}))];
}

export async function github_api_upsert_file(prep, github_path, base64, sha, callback_created, log, message = 'no commit message', HTTP_OK = 200, HTTP_CREATED = 201)
{
    let res_put = {};
    try
    {
        const octokit = new Octokit({auth: prep.github_token});
        const resp_get = sha == null ? await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: github_path, ref: prep.github_branch, headers : prep.headers}) : {};
        if(sha == null && resp_get.status == HTTP_OK)
        {
            sha = resp_get.data.sha;
            if(resp_get.data.encoding == 'base64' && resp_get.data.content.replaceAll('\n', '') == base64.replaceAll('\n', ''))
            {
                return {...resp_get.data, encoding: 'base64', content : base64, url : decodeURI(resp_get.data.html_url)};
            }
        }
        const resp_put = await octokit.rest.repos.createOrUpdateFileContents({owner: prep.github_owner, repo : prep.github_repo, path: github_path, branch: prep.github_branch, message : message, content: base64, ...(sha ? {sha : sha} : {})});
        res_put = {...resp_put.data.content, encoding: 'base64', content : base64, url : decodeURI(resp_put.data.content.html_url)};
        if(resp_put.status == HTTP_CREATED && callback_created != null) callback_created(res_put);
        log('github_api_upsert_file:' + github_api_format_error(resp_put));
    }
    catch(exc)
    {
        log('github_api_upsert_file:' + github_api_format_error(exc));
        res_put = {};
    }
    return res_put;
}

export async function github_api_rename_file(prep, new_file_name, base64, sha, github_repo_curdir_path, log, message = 'no commit message', HTTP_OK = 200)
{
    let res_put = {};
    try
    {
        const octokit = new Octokit({auth: prep.github_token});
        
        const join2 = (path1 : string, path2: string) => (path1 && path2) ? ((path1[path1.length - 1] == '/' ? path1.slice(0, path1.length - 1) : path1) + '/' + (path2[0] == '/' ? path2.substring(1) : path2)) : (path1 && !path2) ? path1 : (!path1 && path2) ? path2 : '';
        const new_github_path = join2(github_repo_curdir_path, new_file_name);
        
        const resp_put = await octokit.rest.repos.createOrUpdateFileContents({owner: prep.github_owner, repo : prep.github_repo, path: new_github_path, branch: prep.github_branch, message : message, content: base64});
        res_put = resp_put.status == HTTP_OK ? {...resp_put.data.content, encoding: 'base64', content : base64, url : decodeURI(resp_put.data.content.html_url)} : {};
        
        const resp_del = resp_put.status == HTTP_OK ? await octokit.rest.repos.deleteFile({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path, ref: prep.github_branch, message : message, sha : sha}) : {};
        res_put = resp_del.status != HTTP_OK ? res_put : {};

        log('github_api_rename_file: | put: ' + github_api_format_error(resp_put) + ' | del: ' + github_api_format_error(resp_del));
    }
    catch(exc)
    {
        log('github_api_rename_file:' + github_api_format_error(exc));
        res_put = {};
    }
    return res_put;
}

function frontmatter_rows_new()
{
    return {frontmatter_id: self.crypto.randomUUID(), frontmatter_key: '', frontmatter_val: ''};
}

function frontmatter_rows_format(frontmatter_rows : Array, frontMatterEmpty : boolean) : string
{
    const frontmatter = {};
    for(let {frontmatter_key, frontmatter_val} of frontmatter_rows)
    {
        if(frontmatter_key == '') continue;
        try
        {
            frontmatter_val = JSON.parse(frontmatter_val);
        }
        catch
        { }
        frontmatter[frontmatter_key] = frontmatter_val;
    }
    const frontmatter_str_inside = stringify(frontmatter).trim();
    const frontmatter_str = frontmatter_str_inside ? `---\n${frontmatter_str_inside}\n---\n\n` : '---\n---\n\n';
    return (frontmatter_str_inside || !frontMatterEmpty) ? frontmatter_str : '';
}

function frontmatter_parse(text : string) : [string, Object]
{
    let frontmatter = null;
    const m = text.match(/^---\n(.*?)\n---\n*/s);
    if(m)
    {
        const frontmatter_str = m[1];
        text = text.substring(m[0].length);
        const parsed = parse(frontmatter_str, {keepSourceTokens : true, stringKeys: true, strict: true});
        if(typeof(frontmatter) !== 'object')
            return [text, null];

        frontmatter = {};
        for(const [frontmatter_key, frontmatter_val] of Object.entries(parsed))
            frontmatter[frontmatter_key] = ['string', 'number', 'boolean'].includes(typeof(frontmatter_val)) ? frontmatter_val.toString() : JSON.stringify(frontmatter_val);
    }
    return [text, frontmatter];
}

function update_location(path : string)
{
    window.history.replaceState({}, document.title, path );
}

function cache_has(key : string) : boolean
{
    return localStorage.getItem(moncms_prefix + key) != null;
}

function cache_load(key : string) : string
{
    return localStorage.getItem(moncms_prefix + key) || '';
}

function cache_save(key : string, value : string = '')
{
    if (value)
        localStorage.setItem(moncms_prefix + key, value);
    else
        localStorage.removeItem(moncms_prefix + key);
}

function load_token(url_value : string) : string
{
    const prep = github_api_prepare_params(url_value);
    return prep.github_repo_url ? cache_load(prep.github_repo_url) : '';
}

function fmt_exc(exc : Error) : string
{
    return (((exc.message || '') + ' | ' +  (exc.stack || '')) ||'').replaceAll('\n', ' ');
}

function fmt_log(text : string) : string
{
    const now = new Date().toISOString();

    return `${now}: ${text}`;
}

function fmt_upload_path(basename: string, upload_path_template : string = '/moncms-content/uploads/${yyyy}/${mm}/${basename}') : string
{
    const now = new Date().toISOString();
    const yyyy = now.slice(0, 4);
    const mm = now.slice(5, 7);

    const upload_path = upload_path_template.replaceAll('${yyyy}', yyyy).replaceAll('${mm}', mm).replaceAll('${basename}', basename);
    return upload_path;
}

function find_meta(doc : Document, key : string) : string
{
    return (Array.from(doc.querySelectorAll('meta')).filter(meta => meta.name == key).pop() || {}).content || '';
}

async function github_discover_url(url : string, key : string, HTTP_OK = 200) : string
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

function init_fields(window_location)
{
    let url_value = '', token_value = '', is_signed_in_value = false, log_value = '';
    if(window_location.search)
    {
        const query_string = new URLSearchParams(window_location.search);
        if(query_string.has('github_url'))
            url_value = query_string.get('github_url');
        if(query_string.has('github_token'))
            token_value = query_string.get('github_token');
        //if(!url_value) url_value = find_meta(document, moncms_prefix);
        if(url_value && !token_value)
        {
            token_value = load_token(url_value);
            if(token_value)
                log_value = fmt_log('got from cache for ' + prep.github_repo_url);
        }
    }
    if(!url_value && window_location.protocol != 'file:')
    {
        const prep = github_api_prepare_params(window_location.href);
        if(prep.github_repo_url)
        {
            url_value = prep.github_repo_url;
            token_value = load_token(url_value);
            if(token_value)
                log_value = fmt_log('got from cache for ' + prep.github_repo_url);
        }
    }
    if(url_value)
    {
        is_signed_in_value = cache_has(url_value);
    }

    return [url_value, token_value, is_signed_in_value, log_value];
}

function try_catch(log, fn)
{
    try
    {
        return fn();
    }
    catch(exc)
    {
        log(fmt_exc(exc));
        return null;
    }
}

function App() {    
    const [url_value, token_value, is_signed_in_value, log_value] = init_fields(window.location);

    const editorRef = useRef(null);
    const fileNameRef = useRef(null);
    const urlRef = useRef(null);
    const filesRef = useRef(null);

    const [log, setLog] = useState(log_value);
    const [logHistory, setLogHistory] = useState(log_value);
    const [token, setToken] = useState(token_value);
    const [url, setUrl] = useState(url_value);
    const [fileName, setFileName] = useState('');
    const [isCompact, setIsCompact] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(is_signed_in_value);
    const [frontMatterRows, setFrontMatterRows] = useState([frontmatter_rows_new()]);
    const [frontMatterEmpty, setFrontMatterEmpty] = useState(true);

    const [curFile, setCurFile] = useState({});
    const [fileTree, setFileTree] = useState([]);
    const [fileTreeValue, setFileTreeValue] = useState('');

    const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

    //const url_discovered = await github_discover_url(window.location.href, meta_key);
    useEffect(() => 
    {
        if(url)
            open_file_or_dir(url, token).catch(moncms_log);
        else
            urlRef.current.focus();
    }, []);

    function moncms_log(err : string | Error)
    {
        const text = (typeof(err) == 'string') ? err : fmt_exc(err);
        setLog(fmt_log(text));
        setLogHistory(prev => fmt_log(text) + '\n' + prev);
    }

    function clear(markdown = '', file_tree : boolean = true, front_matter : boolean = true)
    {
        setCurFile({});
        setFileName('');
        if(file_tree)
            setFileTree([]);
        if(front_matter)
            setFrontMatterRows([frontmatter_rows_new()]);
        
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
        const prep = github_api_prepare_params(url, token, true);
        const files = event.target.files;
        const is_connected = prep.error == '';
        const no_files = fileTree.length == 0;
        const single_file = files.length == 1;
        
        for(const file of files)
        {
            const new_file_name = file.name;
            const reader = new FileReader();
            reader.onload = () => 
            {
                const datauri = reader.result;
                const base64 = datauri.split(',').pop();
                if(is_connected)
                {
                    github_api_upsert_file(
                        prep, 
                        new_file_name, 
                        base64,
                        null,
                        res_created => filetree_add(new_file_name, res_created, false),
                        moncms_log
                    );
                }
                else
                {
                    const url = URL.createObjectURL(file);
                    filetree_add(new_file_name, {name : new_file_name, url : url, type : 'file', encoding: 'base64', content : base64});
                }
            }
            reader.onerror = () => moncms_log('upload: error');
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    }

    async function onclick_createfiledir(newpath_template : string, clear_message : string, iso_date_fmt : string = '0000-00-00', iso_time_fmt : string = 'T00:00:00')
    {
        const now = new Date().toISOString();
        const time = now.slice(iso_date_fmt.length, iso_date_fmt.length + iso_time_fmt.length).replace('T', '').toLowerCase().replaceAll(':', '');
        const date = now.slice(0, iso_date_fmt.length).replace('T', '');
        
        const new_path = newpath_template.replaceAll('${date}', date.toString()).replaceAll('${time}', time.toString());
        clear(clear_message, false, true);
        setFileName(new_path);
        //fileNameRef.current.focus();
    }

    async function onclick_delfile(confirmation_message : string)
    {
        if(!fileName)
            return moncms_log('cannot delete current directory');

        if(Object.entries(curFile).length == 0)
            return clear('', false, true);

        const prep = github_api_prepare_params(url, token, true);
        if(prep.error)
            return moncms_log(prep.error);

        if(!window.confirm(confirmation_message + ` [${curFile.name}]`))
            return;

        const res_del = await github_api_delete_file(prep, curFile.sha, moncms_log);
        if(res_del)
        {
            filetree_del(fileName);
            setUrl(prep.curdir_url());
            clear('', false, true);
        }
    }

    function onclick_downloadfile(event, file_path : string = '', content : string = '', mime : string = '', timeout_millisec : number = 2000)
    {
        /*
        const a = document.createElement('a');
        a.download = file_path;
        a.href = URL.createObjectURL(new Blob([content], {type: mime}));
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
  
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, timeout_millisec);
        */
    }

    async function onclick_savefile()
    {
        if(!fileName)
            return moncms_log('cannot save a file without file name');

        const prep = github_api_prepare_params(url, token, true);
        const curdir_url = prep.curdir_url();

        if(prep.error)
            return moncms_log(prep.error);

        const frontmatter_empty = frontMatterEmpty == true;
        const frontmatter_str = frontmatter_rows_format(frontMatterRows, frontmatter_empty);
        
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
            && curFile.content.replaceAll('\n', '') == base64.replaceAll('\n', '')
            && fileName == curFile.name
            && frontmatter_empty
            && !frontmatter_str
        )
            return moncms_log('no changes');

        const should_rename = Object.entries(curFile || {}).length != 0 && fileName != curFile.name;
        const should_update = Object.entries(curFile || {}).length != 0 && fileName == curFile.name;
        const should_create = Object.entries(curFile || {}).length == 0 && fileName;

        if(should_update)
        {
            const res_put = await github_api_upsert_file(prep, fileName, base64, curFile.sha, null, moncms_log);
            setCurFile(res_put);
        }
        else if(should_create)
        {
            const res_put = await github_api_upsert_file(prep, fileName, base64, '', null, moncms_log);
            setCurFile(res_put);
            setUrl(res_put.url);
            filetree_add(fileName, res_put, true);
        }
        else if(should_rename)
        {
            const res_put = await github_api_rename_file(prep, fileName, base64, curFile.sha, prep.github_repo_curdir_path, moncms_log);
            setCurFile(res_put);
            filetree_rename(curFile.name, curFile);
        }
    }

    function filetree_update(files_and_dirs, curdir_url, parentdir_url, selected_file_name, ext = ['.gif', '.jpg', '.png', '.svg'])
    {
        const key_by_name = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        const files   = files_and_dirs.filter(j => j.type == 'file' && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const dirs   =  files_and_dirs.filter(j => j.type == 'dir'  && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const images =  files_and_dirs.filter(j => j.type == 'file' &&  ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const file_tree = [
            ...(curdir_url ? [{ name: '.' , type: 'dir', url: curdir_url }] : []),
            ...((parentdir_url || curdir_url) ? [{ name: '..', type: 'dir', url: parentdir_url ? parentdir_url : curdir_url }] : []),
            ...dirs,
            ...files,
            ...images
        ];
        const file_tree_value = file_tree.filter(j => j.name == selected_file_name).map(j => j.url).pop() || '';
        setFileTree(file_tree);
        setFileTreeValue(file_tree_value);
    }

    function filetree_add(file_name : string, curFile : Object, update_selected : boolean = true)
    {
        setFileTree([...fileTree, curFile]);
        if(update_selected)
            setFileTreeValue(curFile.url);
    }

    function filetree_del(file_name : string)
    {
        const file_tree = fileTree.filter(j => j.name != file_name);
        setFileTree(file_tree);
        setFileTreeValue(file_tree.length > 0 ? file_tree[0].url : '');
    }

    function filetree_rename(file_name : string, curFile : Object)
    {
        setFileTree(fileTree.map(j => j.name == file_name ? curFile : j));
        setFileTreeValue(curFile.url);
    }
    
    function frontmatter_updaterow(idx : number, name : string, value : string)
    {
        setFrontMatterRows(frontMatterRows.map((item, i) => i == idx ? {...item, [name] : value} : item));
    }

    function frontmatter_delrow(idx : number)
    {
        setFrontMatterRows(frontMatterRows.map((item, i) => (i == 0 && idx == 0) ? {...item, frontmatter_key : '', frontmatter_val : ''} : item).filter((item, i) => idx == 0 || i != idx));
    }

    function frontmatter_addrow(idx : number)
    {
        if(idx == 0)
            setFrontMatterRows([frontmatter_rows_new(), ...frontMatterRows]);
        else if(idx < frontMatterRows.length - 1)
            setFrontMatterRows([...frontMatterRows.slice(0, idx + 1), frontmatter_rows_new(), ...frontMatterRows.slice(idx + 1)]);
        else
            setFrontMatterRows([...frontMatterRows, frontmatter_rows_new()]);
    }

    async function open_file_or_dir(url_value : string = '', token_value : string = '', HTTP_OK : number = 200, ext : Array = ['.gif', '.jpg', '.png', '.svg'])
    {
        const is_virtual_file = url_value.startsWith('blob:');
        let res_file = {}, res_dir = [], curdir_url = '', parentdir_url = '';

        if(is_virtual_file)
        {
            res_dir = fileTree;
            res_file = res_dir.filter(j => j.url == url_value).pop() || {};
        }
        else
        {
            let prep = github_api_prepare_params(url_value, token_value);
            if(prep.error)
            {
                clear('', true, true);
                return moncms_log(prep.error);
            }
            if(!token_value)
            {
                token_value = cache_load(prep.github_repo_url);
                prep = github_api_prepare_params(url_value, token_value); 
                if(token_value)
                {
                    setIsSignedIn(true);
                    setToken(token_value);
                    moncms_log('got from cache for ' + prep.github_repo_url);
                }
            }
            else if(cache_has(prep.github_repo_url))
            {
                setIsSignedIn(true);
                moncms_log('found in cache for ' + prep.github_repo_url);
            }
            if(!prep.github_branch)
                prep.github_branch = await github_api_signin(prep, moncms_log);

            imageCache.prefix = prep.prefix();
            curdir_url = prep.curdir_url()
            parentdir_url = prep.parentdir_url();
            [res_file, res_dir] = await github_api_get_file_and_dir(prep, moncms_log);
        }

        const key_by_name = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        const is_dir = res_file.content === undefined;
        const is_err = Object.entries(res_file).length == 0 && res_dir.length == 0;
        const is_image = !is_dir && ext.some(e => res_file.name.endsWith(e));
        const images = res_dir.filter(j =>j.type == 'file' && ext.some(e => j.name.endsWith(e))).sort(key_by_name);
        const image_listing = is_image ? `# ${res_file.name}\n![${res_file.name}](${res_file.download_url})` : images.map(j => `# ${j.name}\n![${j.name}](${j.download_url})`).join('\n\n');
            
        setCurFile(res_file);

        if(is_err)
        {
            clear('', true, true);
        }
        else if(is_dir)
        {
            setFrontMatterRows([frontmatter_rows_new()]);
            setFrontMatterEmpty(true);

            if(!is_virtual_file) filetree_update(res_dir, curdir_url, parentdir_url, '');
            setFileName('');
            editorRef.current.update(() => 
            {
                const editorState = editorRef.current.getEditorState();
                if (editorState != null)
                {
                    $convertFromMarkdownString(image_listing, PLAYGROUND_TRANSFORMERS);
                    $getRoot().selectStart();
                }
            });
            editorRef.current.setEditable(false);
        }
        else if(is_image)
        {
            setFrontMatterRows([frontmatter_rows_new()]);
            setFrontMatterEmpty(true);

            if(!is_virtual_file) filetree_update(res_dir, curdir_url, parentdir_url, res_file.name);
            setFileName(res_file.name);
            editorRef.current.update(() =>
            {
                const editorState = editorRef.current.getEditorState();
                if (editorState != null)
                {
                    $convertFromMarkdownString(image_listing, PLAYGROUND_TRANSFORMERS);
                    $getRoot().selectStart();
                }
            });
            editorRef.current.setEditable(false);
        }
        else if(!is_image)
        {
            let [text, frontmatter] = [res_file.encoding == 'base64' ? new TextDecoder().decode(Uint8Array.from(window.atob(res_file.content), m => m.codePointAt(0))) : res_file.encoding == 'none' ? ('<file too large>') : (res_file.content || ''), {}];
            [text, frontmatter] = frontmatter_parse(text);
            
            const frontmatter_rows = Object.entries(frontmatter || {}).map(([k, v]) => ({...frontmatter_rows_new(), frontmatter_key : k, frontmatter_val : v}));
            setFrontMatterRows([frontmatter_rows_new(), ...frontmatter_rows]);
            setFrontMatterEmpty(frontmatter === null);

            if(!is_virtual_file) filetree_update(res_dir, curdir_url, parentdir_url, res_file.name);
            setFileName(res_file.name);
            editorRef.current.update(() =>
            {
                const editorState = editorRef.current.getEditorState();
                if (editorState != null)
                {
                    // TODO: HARDEN Error: Create node: Attempted to create node _HorizontalRuleNode that was not configured to be used on the editor.
                    $convertFromMarkdownString(text, PLAYGROUND_TRANSFORMERS);
                    $getRoot().selectStart();
                }
            });
            editorRef.current.setEditable(true);
        }
    }

    async function onclick_signinout()
    {
        if(!isSignedIn)
        {
            if(!token)
                return moncms_log('cannot signin, no token provided');

            const prep = github_api_prepare_params(url, token);
            if(prep.error)
                return moncms_log(prep.error);

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
    <input placeholder="GitHub or public URL:" title="GitHub or public URL:" id="html_url" ref={urlRef} type="text" value={url} onChange={event => setUrl(event.target.value)}  onKeyPress={event => event.code == 'Enter' && open_file_or_dir(url, token).catch(moncms_log)} />
    <input  hidden={isCompact} id="html_token" placeholder="GitHub token:"  type="text" value={token} onChange={event => setToken(event.target.value)} onKeyPress={(event) => event.code == 'Enter' && open_file_or_dir(url, token).catch(moncms_log)} />
    <input  hidden={isCompact} id="html_file_name" placeholder="File name:" type="text" ref={fileNameRef} value={fileName} onChange={event => setFileName(event.target.value)}  onKeyPress={event => event.code == 'Enter' && onclick_savefile().catch(moncms_log)} />
    <input  hidden={isCompact} id="html_log" placeholder="Log:" title={logHistory} value={log} readOnly />
    <select hidden={isCompact} id="html_file_tree" size="10" value={fileTreeValue} onChange={(event) => setFileTreeValue(event.target.value)} onKeyPress={event => (event.code == 'Space' || event.code == 'Enter') ? [setUrl(fileTreeValue), open_file_or_dir(fileTreeValue, token)] : []} onDoubleClick={(event) => [setUrl(fileTreeValue), open_file_or_dir(fileTreeValue, token)]}>
        {fileTree.map((f, i) => (<option key={f.name + ':' + f.url} value={f.url} title={f.url}>{f.name + (f.type == 'dir' ? '/' : '')}</option>))}
    </select>
    <table  hidden={isCompact} id="html_frontmatter">
        <tbody>
            {frontMatterRows.map(({frontmatter_key, frontmatter_val, frontmatter_id}, idx) => (
                <tr key={frontmatter_id}>
                    <td><input type="text" name="frontmatter_key" placeholder="Frontmatter key:"   value={frontmatter_key} onChange={event => frontmatter_updaterow(idx, event.target.name, event.target.value)} /></td>
                    <td><input type="text" name="frontmatter_val" placeholder="Frontmatter value:" value={frontmatter_val} onChange={event => frontmatter_updaterow(idx, event.target.name, event.target.value)} /></td>
                    <td>
                        <button onClick={event => frontmatter_addrow(event.target.parentElement.parentElement.rowIndex)}>Add Another Row</button>
                        <button onClick={event => frontmatter_delrow(event.target.parentElement.parentElement.rowIndex)}>Delete This Row</button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
    <div id="moncms_toolbar">
        <button onClick={() => open_file_or_dir(url, token)}>Open</button>
        <button onClick={onclick_savefile}>Save File</button>
        <button onClick={event => onclick_delfile(event.target.dataset.message).catch(moncms_log)} id="html_delfile" data-message="Do you really want to delete this file?">Delete File</button>
        <button onClick={event => onclick_createfiledir(event.target.dataset.newpath, event.target.dataset.message)} id="html_createfile" data-newpath="${date}-new-post-draft-at-${time}.md" data-message="### modify the file name, modify this content and click Save File to actually create and save the file">New File</button>
        <button onClick={event => onclick_createfiledir(event.target.dataset.newpath, event.target.dataset.message)} id="html_createdir"  data-newpath="new-dir-at-${time}/.gitignore"        data-message="### modify the directory name, and then click Save File to create the file and the directory">New Folder</button>
        
        <button onClick={() => filesRef.current.click()}>Upload Files</button>
        <input type="file" id="html_files" ref={filesRef} onChange={onchange_files} multiple hidden />
        <button onClick={onclick_downloadfile}>Download File</button>
        
        <button onClick={() => onclick_signinout().catch(moncms_log)} className={isSignedIn ? "signout" : "signin"} ></button>
        <button onClick={event => {setUrl(event.target.dataset.message); setToken(''); open_file_or_dir(event.target.dataset.message, '');}} data-message="https://github.com/vadimkantorov/moncms/blob/master/README.md">Help</button>
        <button onClick={() => setIsCompact(!isCompact)}>Compact View</button>
    </div>
    <div className="editor-shell">
    <ImageCacheContext.Provider value={imageCache}><LexicalComposer initialConfig={editorConfig}><EditorRefPlugin editorRef={editorRef} /><ToolbarContext>
      <div className="editor-container">
        <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
        <ShortcutsPlugin setIsLinkEditMode={setIsLinkEditMode} />
        <ImagesPlugin />
        <HorizontalRulePlugin />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="editor-input" />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <LexicalAutoLinkPlugin />
          <LinkPlugin />
          {/*<AutoFocusPlugin />*/}
        </div>
      </div>
      </ToolbarContext></LexicalComposer></ImageCacheContext.Provider>
    </div>
    </>
  );
}

//if(!window.root)
//    window.root = ReactDOM.createRoot(document.getElementById('root'));
ReactDOM.createRoot(document.getElementById('root')).render
(<div className="App"><App /></div>);
//(<React.StrictMode><div className="App"><App /></div></React.StrictMode>);
