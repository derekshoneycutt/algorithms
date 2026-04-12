import { Octokit } from "@octokit/core";
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import { ALGORITHMS_PAGES } from './web/pages.js';

export default function(source) {
    const callback = this.async();

    (async () => {
        // Read the file that we will be working wtih
        const filetext = await fs.readFile('web/template.html', 'utf8');
        const $ = cheerio.load(filetext);

        // Determine which page this markdown file belongs to
        const allPages = [
            ALGORITHMS_PAGES,
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

        // Get the markdown as html to embed directly into the page
        const octokit = new Octokit({
            auth: process.env.MY_GITHUB_MARKDOWN_TOKEN
        });
        const response = await octokit.request('POST /markdown', {
            text: source,
            headers: {
                'X-GitHub-Api-Version': '2026-03-10'
            }
        });

        // Get the sidebar
        const sidebartext = `
            <li class="home_item ${page.page === `${ALGORITHMS_PAGES.page}` ? 'on_page' : ''}">
                <a href="${page.page === `${ALGORITHMS_PAGES.page}` ? "" : ALGORITHMS_PAGES.page}"
                   class="nav_link">
                    <span class="material-symbols-outlined home_icon">home</span>
                    ${ALGORITHMS_PAGES.title}
                </a>
            </li> ${ALGORITHMS_PAGES.writings.map(sidePage => `
            <li class=${page.page === `${sidePage.page}` ? 'on_page' : ""}>
                <a href=${sidePage.page} class="nav_link">
                    ${sidePage.title}
                </a>
            </li>`).join('')}`;

        // Get the breadcrumbs
        const breadcrumbs = ALGORITHMS_PAGES.writings.reduce((arr, book) =>
            (book.page === page.page) ? [...arr, book] : arr, [ALGORITHMS_PAGES]).map(crumb => `
            <li>
                <a href="${crumb.page}">
                    ${crumb.title}
                </a>
            </li>`).join('');

        // Update tags that we retrieved above
        $('#main-article').html(response.data);
        $('title').text(pageTitle);
        $('#side-navlist').html(sidebartext);
        $('ol#breadcrumb-list').html(breadcrumbs);
        $('meta[property="og:title"]').attr('content', pageTitle);
        $('a[href$=\'System-setup.md\']').attr('href', "System-setup.html");
        $('a[href$=\'gentoo-setup.md\']').attr('href', "Gentoo-setup.html");

        callback(null, $.html());
    })().catch(err => { callback(err); });
}
