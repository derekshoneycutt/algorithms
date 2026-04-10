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
const ALGORITHMS_PAGES = {
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

module.exports = {
    ALGORITHMS_PAGES
};