// @ts-nocheck

export function parse_frontmatter(text : String) : [String, Object]
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

export function format_frontmatter(html_frontmatter) {
    const frontmatter_str_inside = Array.from(html_frontmatter.rows).filter(html_tr => html_tr.querySelectorAll('input')[0].value).map(html_tr => html_tr.querySelectorAll('input')[0].value + ': "' + html_tr.querySelectorAll('input')[1].value + '"').join('\n');
    const frontmatter_str = `---\n${frontmatter_str_inside}\n---\n\n`;

    if (html_frontmatter.dataset.empty == 'false')
        return frontmatter_str;

    return frontmatter_str_inside ? frontmatter_str : '';
}

function update_frontmatter(html_frontmatter, frontmatter)
{
    html_frontmatter.dataset.empty = frontmatter == null ? 'true' : 'false';

    const html_header = html_frontmatter.getElementsByTagName('tr')[0];
    Array.from(html_header.getElementsByTagName('input')).forEach(input => input.value = '');
    
    const entries = Object.entries(frontmatter || {});
    
    let i = 0;
    for(; i < entries.length; i++)
    {
        const [k, v] = entries[i];
        let html_row = html_frontmatter.rows[1 + i];
        if(html_row == null)
        {
            html_row = html_header.cloneNode(true);
            html_frontmatter.appendChild(html_row);
        }

        const [html_inputkey, html_inputval] = Array.from(html_row.getElementsByTagName('input'));
        [html_inputkey.value, html_inputval.value] = [`${k}`, `${v}`];
    }
    for(let j = html_frontmatter.rows.length - 1; j > i; j--)
        html_frontmatter.deleteRow(j);
}