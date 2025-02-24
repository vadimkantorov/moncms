// based on https://github.com/tigt/mini-svg-data-uri/issues/24

let svg = "";
process.stdin.on("data", (chunk) => {  svg += chunk; });
process.stdin.on("end", async () => 
{
    const reWhitespace = /\s+/g, reUrlHexPairs = /%[\dA-F]{2}/g, hexDecode = {'%20': ' ', '%3D': '=', '%3A': ':', '%2F': '/'}, specialHexDecode = match => hexDecode[match] || match.toLowerCase();
    if(svg.charCodeAt(0) === 0xfeff) svg = svg.slice(1);
    svg = svg.trim().replace(reWhitespace, ' ').replaceAll('"', '\'');
    svg = encodeURIComponent(svg);
    svg = svg.replace(reUrlHexPairs, specialHexDecode);
    const datauri = 'data:image/svg+xml,' + svg.replace(/ /g, '%20');
    
    console.log(datauri);
});