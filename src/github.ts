// @ts-nocheck

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

        github_repo_path: '',
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

    prep.prefix = `https://raw.githubusercontent.com/${github_repo_username}/${github_repo_name}/${github_repo_tag}/`;
    // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
    prep.headers = {
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json',
        'If-None-Match': '',
        'Authorization': github_token ? `Bearer ${github_token}` : ''
    };

    return prep;
}

export async function github_api_signin(prep, log, HTTP_OK = 200, HTTP_ERROR = 500)
{
    let resp_get = {};
    try
    {
        resp_get = await fetch(prep.contents_api_url_get, { method: 'GET', headers: prep.headers });
    }
    catch
    {
        resp_get = {status : HTTP_ERROR};
    }
    log('GET ' + github_api_format_error(resp_get));
    return resp_get.status == HTTP_OK;
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

export async function github_api_get_file_dir(prep, log, HTTP_OK = 200, HTTP_ERROR = 500)
{
    let resp_file = {}, resp_dir = {}, res_file = {}, res_dir = [];
    try
    {
        resp_file = await fetch(prep.contents_api_url_get, { method: 'GET', headers: prep.headers });
        res_file = await resp_file.json();
        
        resp_dir = prep.contents_api_url_get != prep.contents_api_dir_url_get ? (await fetch(prep.contents_api_dir_url_get, { method: 'GET', headers: prep.headers })) : resp_file;
        res_dir = prep.contents_api_url_get != prep.contents_api_dir_url_get ? (await resp_dir.json()) : res_file;
        
        if(!prep.github_branch && res_file == res_dir)
        {
            for(const j of res_dir.filter(j => j.name.toLowerCase() == 'README.md'.toLowerCase()))
            {
                resp_file = await fetch(j.git_url, { method: 'GET', headers: prep.headers });
                res_file = {...j, ...await resp_file.json()};
            }
        }
    }
    catch
    {
        resp_file = resp_dir = {status : HTTP_ERROR };
        res_file = {};
        res_dir = [];
    }
    
    if(resp_file.status != HTTP_OK || resp_dir.status != HTTP_OK)
    {
        log('error ' + github_api_format_error(resp_file, res_file) + ' | dir: ' + github_api_format_error(resp_dir, res_dir));
        return [{}, []];
    }
    
    log('GET file: ' + github_api_format_error(resp_file, res_file) + ' | dir: ' + github_api_format_error(resp_dir, res_dir));
    return [res_file, res_dir];
}

export async function github_api_delete_file(prep, retrieved_contents_sha, log, message = 'no commit message', HTTP_ERROR = 500)
{
    const req = {sha: retrieved_contents_sha, message : message};
    if(prep.github_branch)
        req.branch = prep.github_branch;
    let resp_del = {}, res_del = {};
    try
    {
        const resp_del = await fetch(prep.contents_api_url_put, { method: 'DELETE', headers: prep.headers, body: JSON.stringify(req) });
        const res_del = await resp.json();
    }
    catch
    {
        resp_del = { status: HTTP_ERROR };
        res_del = { };
    }
    log('DEL ' + github_api_format_error(resp_del, res_del));
    return res_del;
}

export async function github_api_rename_file(prep, new_file_name, base64, retrieved_contents_sha, log, message = 'no commit message')
{
    const [resp_put, res_put] = await github_api_update_file({...prep, contents_api_url_put : join2(prep.contents_api_dir_url_put, new_file_name)}, null, base64, log);
    const retrieved_contents = {encoding: 'base64', content : base64, ...res_put.content};
    await github_api_delete_file(prep, retrieved_contents_sha, log);
    return retrieved_contents;
}
