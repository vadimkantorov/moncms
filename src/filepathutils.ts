export function dirname(path) {
    if (!path)
        return '';
    return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
}
export function basename(path) {
    if (!path)
        return '';
    return path.includes('/') ? path.substring(1 + path.lastIndexOf('/')) : path;
}
export function join2(path1, path2) {
    const path1_ = path1[path1.length - 1] == '/' ? path1.slice(0, path1.length - 1) : path1;
    const _path2 = path2[0] == '/' ? path2.substring(1) : path2;
    return (path1 && path2) ? (path1_ + '/' + _path2) : (path1 && !path2) ? path1 : (!path1 && path2) ? path2 : '';
}
export function sanitize_file_name(path) {
    if (!path)
        return '';
    path = path.startsWith('/') ? path.substring(1) : path;
    path = path.endsWith('/') ? path.slice(0, path.length - 1) : path;
    return path;
}
