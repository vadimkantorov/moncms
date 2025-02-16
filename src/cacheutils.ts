export function cache_load(key : string) {
    return localStorage.getItem("moncms_" + key);
}

export function cache_save(key : string, value : string) {
    if (value)
        localStorage.setItem("moncms_" + key, value);

    else
        localStorage.removeItem("moncms_" + key);
}
