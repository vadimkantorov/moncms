export function update_file_tree(files_and_dirs, curdir_url, parentdir_url, selected_file_name, ext = ['.gif', '.jpg', '.png', '.svg']) {
    const key_by_name = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    const files = files_and_dirs.filter(j => j.type == 'file' && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
    const dirs = files_and_dirs.filter(j => j.type == 'dir' && !ext.some(e => j.name.endsWith(e))).sort(key_by_name);
    const images = files_and_dirs.filter(j => j.type == 'file' && ext.some(e => j.name.endsWith(e))).sort(key_by_name);

    const html_url = document.getElementById('html_url');
    const html_file_tree = document.getElementById('html_file_tree');
    const file_tree = [{ name: '.', type: 'dir', html_url: curdir_url }, { name: '..', type: 'dir', html_url: parentdir_url ? parentdir_url : curdir_url }, ...dirs, ...files, ...images];
    let i = 0;
    for (; i < file_tree.length; i++) {
        let html_option = html_file_tree.options[i];
        if (html_option == null) {
            html_option = document.createElement('option');
            html_file_tree.options.add(html_option);
        }
        html_option.text = file_tree[i].name + (file_tree[i].type == 'dir' ? '/' : '');
        html_option.selected = file_tree[i].name == selected_file_name;
        html_option.value = file_tree[i].html_url;
        html_option.title = html_option.value;
        html_option.dataset.type = file_tree[i].type;
    }
    for (let j = html_file_tree.length - 1; j >= i; j--)
        html_file_tree.options.remove(j);
}
export function rename_file_tree(selected_file_name, retrieved_contents) {
    const html_url = document.getElementById('html_url');
    const html_file_tree = document.getElementById('html_file_tree');
    for (const html_option of html_file_tree.querySelectorAll(`option[title="${selected_file_name}"]`)) {
        html_option.text = retrieved_contents.name;
        html_option.value = retrieved_contents.html_url;
        html_option.title = html_option.value;
    }
}
export function add_file_tree(res) {
    const html_url = document.getElementById('html_url');
    const html_file_tree = document.getElementById('html_file_tree');
    const html_option = document.createElement('option');
    html_option.text = res.name;
    html_option.dataset.type = 'file';
    html_option.value = res.html_url;
    html_option.title = html_option.value;
    html_file_tree.options.add(html_option);
}
export function delete_file_tree(selected_file_name) {
    const html_file_tree = document.getElementById('html_file_tree');
    for (const html_option of html_file_tree.querySelectorAll(`option[title="${selected_file_name}"]`))
        html_file_tree.removeChild(html_option);
}
