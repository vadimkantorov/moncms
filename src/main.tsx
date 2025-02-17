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

import {useRef} from 'react';
import {EditorRefPlugin} from "@lexical/react/LexicalEditorRefPlugin";
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
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

import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import {parseAllowedColor, parseAllowedFontSize} from './styleConfig';


import { join2 } from './filepathutils.ts';
import { github_api_prepare_params } from './github.ts';
import { format_frontmatter, parse_frontmatter, update_frontmatter } from './frontmatter.ts';
import { cache_load, cache_save } from './cacheutils.ts';
import { add_file_tree, delete_file_tree, rename_file_tree, update_file_tree } from './filetreeutils.ts';

let retrieved_contents = {}; 

function window_editor_setMarkdown(text : string)
{

}

function window_editor_setEditable(editable : boolean)
{

}

function update_location(path)
{
    // https://stackoverflow.com/questions/2494213/changing-window-location-without-triggering-refresh
    window.history.replaceState({}, document.title, path );
}

async function discover_github_url(url, key = 'moncmsdefault', HTTP_OK = 200)
{
    if(!url)
        return '';

    if(url == window.location.href || !url.startsWith('file:'))
    {
        let doc = document;
        if(url != window.location.href)
        {
            const resp = await fetch(url).catch(err => ({ok: false, e : err}));
            if(!resp.ok)
                return '';

            const html = await resp.text();
            const parser = new DOMParser();
            doc = parser.parseFromString(html, 'text/html');
        }
        return (Array.from(doc.querySelectorAll('meta')).filter(meta => meta.name == key).pop() || {}).content || '';
    }
    return '';
}

function github_api_format_error(resp, res = {})
{
    const resp_status = resp.status || '000';
    const res_message = (res || {}).message || '';
    return `${resp_status}: ` + ({200: 'OK', 201: 'OK Created', 404: 'Resource not found', 409: 'Conflict', 422: 'Already Exists. Validation failed, or the endpoint has been spammed.', 401: 'Unauthorized', 403: 'Forbidden: ' + res_message}[resp_status] || '');
}

async function github_api_get_file(prep, moncms_log)
{
    const resp_file = await fetch(prep.contents_api_url_get, { method: 'GET', headers: prep.headers });
    const res_file = await resp_file.json();
    moncms_log('GET ' + github_api_format_error(resp_get, res_get));
    return res_file;
}

async function github_api_signin(prep, moncms_log, HTTP_OK = 200)
{
    const resp_get = await fetch(prep.contents_api_url_get, { method: 'GET', headers: prep.headers });
    moncms_log('GET ' + github_api_format_error(resp_get));
    return resp_get.status == HTTP_OK;
}

async function github_api_get_file_dir(prep, moncms_log, HTTP_OK = 200)
{
    let resp_file = await fetch(prep.contents_api_url_get, { method: 'GET', headers: prep.headers });
    let res_file = await resp_file.json();
    
    const resp_dir = prep.contents_api_url_get != prep.contents_api_dir_url_get ? (await fetch(prep.contents_api_dir_url_get, { method: 'GET', headers: prep.headers })) : resp_file;
    const res_dir = prep.contents_api_url_get != prep.contents_api_dir_url_get ? (await resp_dir.json()) : res_file;
    
    if(!prep.github_branch && res_file == res_dir)
    {
        for(const j of res_dir.filter(j => j.name.toLowerCase() == 'README.md'.toLowerCase()))
        {
            resp_file = await fetch(j.git_url, { method: 'GET', headers: prep.headers });
            res_file = {...j, ...await resp_file.json()};
        }
    }
    
    if(resp_file.status != HTTP_OK || resp_dir.status != HTTP_OK)
    {
        moncms_log('error ' + github_api_format_error(resp_file, res_file) + ' | dir: ' + github_api_format_error(resp_dir, res_dir));
        return [{}, null];
    }
    
    moncms_log('GET file: ' + github_api_format_error(resp_file, res_file) + ' | dir: ' + github_api_format_error(resp_dir, res_dir));
    
    return [res_file, res_dir];
}

async function github_api_update_file(prep, retrieved_contents_sha, base64, moncms_log, message = 'no commit message')
{
    const req = { message : message, content : base64 };
    if(prep.github_branch)
        req.branch = prep.github_branch;
    if(retrieved_contents_sha)
        req.sha = retrieved_contents_sha;
    const resp = await fetch(prep.contents_api_url_put, { method: 'PUT', headers: prep.headers, body: JSON.stringify(req) });
    const res = await resp.json();
    return [resp, res];
}

async function github_api_create_file(prep, base64, moncms_log, message = 'no commit message')
{
    const req = { message : message, content : base64 };
    if(prep.github_branch)
        req.branch = prep.github_branch;
    const resp_put = await fetch(prep.contents_api_url_put, { method: 'PUT', headers: prep.headers, body: JSON.stringify(req) });
    const res_put = await resp_put.json();
    moncms_log('PUT ' + github_api_format_error(resp_put, res_put));
    return [resp_put, res_put];
}

async function github_api_upsert_file(prep, new_file_name, base64, moncms_log, message = 'no commit message', HTTP_CREATED = 201, HTTP_EXISTS = 422)
{
    const contents_api_url_put = join2(prep.contents_api_dir_url_put, new_file_name);
    const contents_api_url_get = join2(prep.contents_api_dir_url_put, new_file_name) + (prep.github_branch ? `?ref=${prep.github_branch}` : '');
    let [resp_put, res_put] = await github_api_update_file({...prep, contents_api_url_put : contents_api_url_put }, null, base64, moncms_log);
    if(resp_put.status == HTTP_CREATED)
        add_file_tree(res_put.content);
    
    if(resp_put.status == HTTP_EXISTS)
    {
        const res_get = await github_api_get_file({...prep, contents_api_url_get : contents_api_url_get}, moncms_log);
        
        [resp_put, res_put] = await github_api_update_file({...prep, contents_api_url_put : contents_api_url_put}, res_get.sha, base64, moncms_log);
    }
    return res_put;
}

async function github_api_rename_file(prep, new_file_name, base64, retrieved_contents, moncms_log, message = 'no commit message')
{
    const _retrieved_contents = retrieved_contents;
    const [resp_put, res_put] = await github_api_update_file({...prep, contents_api_url_put : join2(prep.contents_api_dir_url_put, new_file_name)}, null, base64, moncms_log);
    retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
    await github_api_delete_file(prep, _retrieved_contents, moncms_log);
    return retrieved_contents;
}

async function github_api_delete_file(prep, retrieved_contents, moncms_log, message = 'no commit message')
{
    const req = {
        sha: retrieved_contents.sha,
        message : message,
    };
    if(prep.github_branch)
        req.branch = prep.github_branch;
    const resp_del = await fetch(prep.contents_api_url_put, { method: 'DELETE', headers: prep.headers, body: JSON.stringify(req) });
    const res_del = await resp.json();
    moncms_log('DEL ' + github_api_format_error(resp_del, res_del));
    return res_del;
}

function moncms_log(text)
{
    const html_log = document.getElementById('html_log');
    const now = new Date().toISOString();
    html_log.value = `${now}: ${text}`;
    //html_log.value += '\n' + text; html_log.scrollTop = html_log.scrollHeight;
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
        reader.onload = () => github_api_upsert_file(prep, new_file_name, reader.result.split(',')[1], moncms_log);
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

async function onclick_help()
{
    const html_url = document.getElementById('html_url');
    const html_token = document.getElementById('html_token');
    const html_help = document.getElementById('html_help');
    html_url.value = html_help.dataset.message;
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
    const html_signinout = document.getElementById('html_signinout');
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
    
    html_signinout.className = html_token.value ? 'signout' : 'signin';
    
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

function onkeypress_save(event)
{
    if(event.code == 'Enter')
        onclick_savefile();
}

function onkeypress_enter_url(event)
{
    if (event.code === 'Enter')
        onclick_open();
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

function onclick_togglecompactview()
{
    const html_token = document.getElementById('html_token');
    const html_file_tree = document.getElementById('html_file_tree');
    const html_log = document.getElementById('html_log');
    const html_frontmatter = document.getElementById('html_frontmatter');
    const hidden = !html_file_tree.hidden;
    html_file_tree.hidden = html_log.hidden = html_token.hidden = html_frontmatter.hidden = html_file_name.hidden = hidden;
}

async function onclick_signinout()
{
    const html_url = document.getElementById('html_url');
    const html_token = document.getElementById('html_token');
    const html_signinout = document.getElementById('html_signinout');
    if(html_signinout.className == 'signin')
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
            html_signinout.className = 'signout';
            moncms_log('saved to cache for ' + prep.github_repo_url);
            onclick_open();
        }
        else
            clear();
    }
    else if(html_signinout.className == 'signout')
    {
        clear();
        html_token.value = '';
        html_signinout.className = 'signin';
        
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
        const discovered = await discover_github_url(window.location.href);
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

const placeholder = 'Enter some rich text...';

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
  nodes: [ParagraphNode, TextNode],
  onError(error: Error) {
    throw error;
  },
  theme: ExampleTheme,
};

export default function App() {
  const editor = useRef(null);
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <EditorRefPlugin editorRef={editor} />
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
  );
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="App">
      <input placeholder="GitHub or public URL:" title="GitHub or public URL:" id="html_url" type="text"  onKeyPress={onkeypress_enter_url} />
      <input placeholder="GitHub token:" title="GitHub token:" id="html_token" type="text" onKeyPress={onkeypress_enter_url} />
      <input placeholder="File name:" title="File name:" id="html_file_name" type="text" onKeyPress={onkeypress_save} />
      <input placeholder="Log:" title="Log:" id="html_log" readOnly />
      <select id="html_file_tree" size="10" onKeyPress={ondblclick_enter_file_tree} onDoubleClick={ondblclick_enter_file_tree}></select>
      <table id="html_frontmatter">
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
      
      <button onClick={onclick_help} id="html_help" data-message="https://github.com/vadimkantorov/moncms/blob/gh-pages/README.md">Help</button>
      <button id="html_signinout" className="signin" onClick={onclick_signinout}></button>
      <button id="html_togglecompactview" onClick={onclick_togglecompactview}>Toggle Compact View</button>
      
      <App />

    </div>
  </React.StrictMode>,
);
