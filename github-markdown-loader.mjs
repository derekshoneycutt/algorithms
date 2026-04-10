import { Octokit } from "@octokit/core";
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import { ALGORITHMS_PAGES } from './web/pages.js';

export default function(source) {
    const callback = this.async();

    (async () => {
        // Determine which page this markdown file belongs to
        const allPages = [
            {
                title: ALGORITHMS_PAGES.title,
                template: ALGORITHMS_PAGES.template
            },
            ...ALGORITHMS_PAGES.writings
        ];
        
        // Find the page based on the markdown template file being processed
        const currentFile = this.resource; // absolute path to the markdown file
        const normalizedCurrent = currentFile.replace(/\\\\/g, '/'); // normalize path separators
        
        // Sort pages by template specificity (longer = more specific) to match correctly
        const sortedPages = allPages.sort((a, b) => b.template.length - a.template.length);
        
        const page = sortedPages.find(p => {
            const normalizedTemplate = p.template.replace(/\\\\/g, '/');
            // Match by comparing normalized paths - endsWith for direct match, includes for path segments
            return normalizedCurrent.endsWith(normalizedTemplate) || 
                   normalizedCurrent.includes('/' + normalizedTemplate);
        });
        
        const pageTitle = page ? `Derek's Algorithms Project: ${page.title}` : `Derek's Algorithms Project`;

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
        
        // Update title and og:title meta tag
        $('title').text(pageTitle);
        $('meta[property="og:title"]').attr('content', pageTitle);
        
        $('a[href$=\'System-setup.md\']').attr('href', "System-setup.html");
        $('a[href$=\'gentoo-setup.md\']').attr('href', "Gentoo-setup.html");

        callback(null, $.html());
    })().catch(err => { callback(err); });
}
