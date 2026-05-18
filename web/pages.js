/**
 * @typedef {Object} WritingNode Node describing a writing to display on the page
 * @property {string} title Title of the page to display for the node
 * @property {string} page The page to display this node on
 */
/**
 * @typedef {Object} Writings A description of a collection of writings to display on the page
 * @property {string} title Title of the page to display
 * @property {string} page The page to display this book on
 * @property {WritingNode} definitions Definitions to display

*/

/**
 * @typedef {Object} AlgorithmsPagesModule Module containing a description of the pages for the algorithms project
 * @property {Writings} ALGORITHMS_PAGES The main algorithms pages
 */
export const ALGORITHMS_PAGES = {
    title: "Algorithms Home",
    page: "index.html",
    template: "README.md",
    writings: [
        {
            title: "1. Hello world",
            page: "random_helloworld.html",
            template: "src/random/hello_world/README.md"
        },
        {
            title: "2. Euclid's GCD",
            page: "numeric_euclidgcd.html",
            template: "src/numeric/euclidgcd/README.md"
        },
        {
            title: "3. Max",
            page: "numeric_max.html",
            template: "src/numeric/max/README.md"
        },
        {
            title: "System Setup",
            page: "System-setup.html",
            template: "System-setup.md"
        },
        {
            title: "Gentoo Setup",
            page: "Gentoo-setup.html",
            template: "gentoo-setup.md"
        },
    ]
};