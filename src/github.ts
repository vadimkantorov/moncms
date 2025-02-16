import { dirname } from './filepathutils';

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
