// @ts-nocheck
import { dirname } from './filepathutils';

export function github_api_format_error(resp, res = {})
{
    const resp_status = resp.status || '000';
    const res_message = (res || {}).message || '';
    return `${resp_status}: ` + ({200: 'OK', 201: 'OK Created', 404: 'Resource not found', 409: 'Conflict', 422: 'Already Exists. Validation failed, or the endpoint has been spammed.', 401: 'Unauthorized', 403: 'Forbidden: ' + res_message}[resp_status] || '');
}
export async function github_discover_url(url, key = 'moncmsdefault', HTTP_OK = 200)
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
export function github_api_prepare_params(github_url : String, github_token : String = '', must_have_token : boolean = false) : Object {
    const prep = {
        headers: {},
        error: '',

        github_repo_path: '',
        github_branch: '',
        github_repo_url: '',
        contents_api_url_get: '',
        contents_api_url_put: '',
        contents_api_dir_url_put: '',
        contents_api_dir_url_get: '',
        curdir_url: '',
        parentdir_url: '',
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

    let github_repo_username = '', github_repo_name = '', github_repo_tag = '', github_repo_file_path = '', github_repo_dir_path = '';

    const m1 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/blob\/(.+?)\/(.+)/i);
    const m2 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/tree\/(.+?)\/(.+)/i);
    const m3 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/tree\/(.+)/i);
    const m4 = github_url_normalized.match(/https:\/\/github.com\/(.+)\/(.+)\/?/i);
    const m5 = github_url_normalized.match(/https:\/\/(.+)\.github.io\/(.+)\/?/i);
    const m6 = github_url_normalized.match(/https:\/\/(.+)\.github.io\/?/i);

    if (m1)
        [, github_repo_username, github_repo_name, github_repo_tag, github_repo_file_path] = m1;
    else if (m2)
        [, github_repo_username, github_repo_name, github_repo_tag, github_repo_dir_path] = m2;
    else if (m3)
        [, github_repo_username, github_repo_name, github_repo_tag] = m3;
    else if (m4)
        [, github_repo_username, github_repo_name] = m4;
    else if (m5)
        [, github_repo_username, github_repo_name] = m5;
    else if (m6)
        [github_repo_username, github_repo_name] = m6[1], (m6[1] + '.github.io');

    else {
        prep.error = 'github_url could not be matched';
        return prep;
    }
    github_repo_name = github_repo_name.replace(/\/$/g, '');
    github_repo_dir_path = github_repo_dir_path.replace(/\/$/g, '');
    github_repo_tag = github_repo_tag.replace(/\/$/g, '');

    const github_repo_path = github_repo_file_path || github_repo_dir_path;
    const github_repo_parent_path = !github_repo_path ? '' : github_repo_path.includes('/') ? dirname(github_repo_path) : '';

    prep.github_repo_path = github_repo_path;
    prep.github_branch = github_repo_tag;
    prep.github_repo_url = `https://github.com/${github_repo_username}/${github_repo_name}`;
    prep.contents_api_url_get = `https://api.github.com/repos/${github_repo_username}/${github_repo_name}/contents/${github_repo_path}` + (github_repo_tag ? `?ref=${github_repo_tag}` : '');
    prep.contents_api_url_put = `https://api.github.com/repos/${github_repo_username}/${github_repo_name}/contents/${github_repo_path}`;
    prep.contents_api_dir_url_put = github_repo_dir_path ? prep.contents_api_url_put : `https://api.github.com/repos/${github_repo_username}/${github_repo_name}/contents/${dirname(github_repo_path)}`;

    prep.contents_api_dir_url_get = github_repo_dir_path ? prep.contents_api_url_get : (`https://api.github.com/repos/${github_repo_username}/${github_repo_name}/contents/${github_repo_parent_path}` + (github_repo_tag ? `?ref=${github_repo_tag}` : ''));

    const slashIdx2 = github_repo_path.lastIndexOf('/');
    const slashIdx1 = github_repo_path.slice(0, slashIdx2).lastIndexOf('/');

    const github_repo_curdir_path = github_repo_dir_path ? github_repo_path : github_repo_file_path ? (slashIdx2 != -1 ? github_repo_path.slice(0, slashIdx2) : '') : null;

    const github_repo_parentdir_path = github_repo_dir_path ? (slashIdx2 != -1 ? github_repo_path.slice(0, slashIdx2) : '') : github_repo_file_path ? ((slashIdx2 != -1 && slashIdx1 != -1) ? github_repo_path.slice(0, slashIdx1) : (slashIdx2 != -1 && slashIdx1 == -1) ? '' : null) : null;

    prep.curdir_url = `https://github.com/${github_repo_username}/${github_repo_name}/tree/${github_repo_tag}/${github_repo_curdir_path || ""}`;
    prep.parentdir_url = github_repo_parentdir_path != null ? `https://github.com/${github_repo_username}/${github_repo_name}/tree/${github_repo_tag}/${github_repo_parentdir_path}` : prep.curdir_url;

    // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
    prep.headers = {
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json',
        'If-None-Match': '',
        'Authorization': github_token ? `Bearer ${github_token}` : ''
    };

    return prep;
}
export async function github_api_update_file(prep, retrieved_contents_sha, base64, moncms_log, message = 'no commit message')
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
export async function github_api_get_file(prep, moncms_log)
{
    const resp_file = await fetch(prep.contents_api_url_get, { method: 'GET', headers: prep.headers });
    const res_file = await resp_file.json();
    moncms_log('GET ' + github_api_format_error(resp_get, res_get));
    return res_file;
}
export async function github_api_signin(prep, moncms_log, HTTP_OK = 200)
{
    const resp_get = await fetch(prep.contents_api_url_get, { method: 'GET', headers: prep.headers });
    moncms_log('GET ' + github_api_format_error(resp_get));
    return resp_get.status == HTTP_OK;
}
export async function github_api_create_file(prep, base64, moncms_log, message = 'no commit message')
{
    const req = { message : message, content : base64 };
    if(prep.github_branch)
        req.branch = prep.github_branch;
    const resp_put = await fetch(prep.contents_api_url_put, { method: 'PUT', headers: prep.headers, body: JSON.stringify(req) });
    const res_put = await resp_put.json();
    moncms_log('PUT ' + github_api_format_error(resp_put, res_put));
    return [resp_put, res_put];
}
export async function github_api_delete_file(prep, retrieved_contents, moncms_log, message = 'no commit message')
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