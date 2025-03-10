// @ts-nocheck

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
        const res = (await octokit.rest.repos.get({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_repo_url, ref: prep.github_branch})).data
        log('github_api_signin: OK');
        return res.default_branch;
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
            res_file = (await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path, ref: prep.github_branch})).data;
            res_dir = (await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path_dir, ref: prep.github_branch})).data;
        }
        else
        {
            res_dir = (await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: prep.github_path_dir, ref: prep.github_branch})).data;
            const github_path = [''].concat(res_dir.filter(j => j.name.toLowerCase() == default_file_name.toLowerCase()).map(j => j.path)).pop();
            res_file = github_path ? (await octokit.rest.repos.getContent({owner: prep.github_owner, repo : prep.github_repo, path: github_path, ref: prep.github_branch})).data : {};
        }
    }
    catch
    {
        log('error: github_api_get_file_dir');
        res_file = {};
        res_dir = [];
    }
    
    return [({name : res_file.name, type : res_file.type, content : res_file.content, encoding: res_file.encoding, download_url : res_file.download_url, url : decodeURI(res_file.html_url)}), res_dir.map(f => ({name : f.name, type : f.type, encoding : f.encoding, content : f.content, download_url : f.download_url, url : decodeURI(f.html_url)}))];
}

export async function github_api_update_file(prep, retrieved_contents_sha, base64, log, message = 'no commit message', HTTP_ERROR = 500)
{
    const req = { message : message, content : base64 };
    if(prep.github_branch)
        req.branch = prep.github_branch;
    if(retrieved_contents_sha)
        req.sha = retrieved_contents_sha;
    
    let resp_put = {}, res_put = {};
    try
    {
        resp_put = await fetch(prep.contents_api_url_put, { method: 'PUT', headers: prep.headers, body: JSON.stringify(req) });
        res_put = await resp_put.json();
    }
    catch
    {
        resp_put = {status : HTTP_ERROR};
        res_put = {};
    }
    log('PUT ' + github_api_format_error(resp_put, res_put));
    return [resp_put, res_put];
}

export async function github_api_upsert_file(prep, new_file_name, base64, sha, add_file_tree, log, message = 'no commit message', HTTP_CREATED = 201, HTTP_EXISTS = 422)
{
    const contents_api_url_put = join2(prep.contents_api_dir_url_put, new_file_name);
    const contents_api_url_get = join2(prep.contents_api_dir_url_put, new_file_name) + (prep.github_branch ? `?ref=${prep.github_branch}` : '');
    
    let [resp_put, res_put] = await github_api_update_file({...prep, contents_api_url_put : contents_api_url_put }, sha, base64, log);
    
    if(resp_put.status == HTTP_CREATED && add_file_tree != null)
        add_file_tree(res_put.content);
    
    if(resp_put.status == HTTP_EXISTS)
    {
        const resp_get = await fetch(contents_api_url_get, { method: 'GET', headers: prep.headers });
        const res_get = await resp_file.json();
        log('GET ' + github_api_format_error(resp_get, res_get));
        // TODO: update file tree?
        [resp_put, res_put] = await github_api_update_file({...prep, contents_api_url_put : contents_api_url_put}, res_get.sha, base64, log);
    }
    return res_put;
}

export async function github_api_rename_file(prep, new_file_name, base64, retrieved_contents_sha, log, message = 'no commit message')
{
    const [resp_put, res_put] = await github_api_update_file({...prep, contents_api_url_put : join2(prep.contents_api_dir_url_put, new_file_name)}, null, base64, log);
    const retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
    const res_del = await github_api_delete_file(prep, retrieved_contents_sha, log);
    return retrieved_contents;
}
