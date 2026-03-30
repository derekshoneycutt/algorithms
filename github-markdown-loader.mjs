import { Octokit } from "@octokit/core";
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';

export default function(source) {
    const callback = this.async();

    (async () => {
        const octokit = new Octokit();
        const response = await octokit.request('POST /markdown', {
            text: source,
            headers: {
                'X-GitHub-Api-Version': '2026-03-10'
            }
        });

        const filetext = await fs.readFile('web/template.html', 'utf8');
        const $ = cheerio.load(filetext);
        $('#main-article').html(response.data);
        $('a[href$=\'System-setup.md\']').attr('href', "System-setup.html");
        $('a[href$=\'gentoo-setup.md\']').attr('href', "Gentoo-setup.html");

        callback(null, $.html());
    })().catch(err => { callback(err); });
}
