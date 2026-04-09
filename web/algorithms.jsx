import './markdown.css';
import '@material/web/fab/fab.js';
import '@material/web/icon/icon.js';
import './style.scss';

import SocialHeadPng from "./socialhead.png";
import IconAda from "../icons/ada.svg";
import IconBallerina from "../icons/ballerina.svg";
import IconC from "../icons/c.svg";
import IconCpp from "../icons/cpp.svg";
import IconCsharp from "../icons/csharp.svg";
import IconClojure from "../icons/clojure.svg";
import IconCOBOL from "../icons/cobol.svg";
import IconD from "../icons/d.svg";
import IconDart from "../icons/dart.svg";
import IconEiffel from "../icons/eiffel.svg";
import IconElixir from "../icons/elixir.svg";
import IconErlang from "../icons/erlang.svg";
import IconFsharp from "../icons/fsharp.svg";
import IconFactor from "../icons/factor.svg";
import IconFreeBASIC from "../icons/freebasic.svg";
import IconForth from "../icons/forth.svg";
import IconFortran from "../icons/fortran.svg";
import IconGleam from "../icons/gleam.svg";
import IconGo from "../icons/go.svg";
import IconHaskell from "../icons/haskell.svg";
import IconHaxe from "../icons/haxe.svg";
import IconIcon from "../icons/icon.svg";
import IconIdris from "../icons/idris.svg";
import IconJava from "../icons/java.svg";
import IconJavascript from "../icons/javascript.svg";
import IconJulia from "../icons/julia.svg";
import IconKit from "../icons/kit.svg";
import IconKotlin from "../icons/kotlin.svg";
import IconLLVMIR from "../icons/llvm.png";
import IconLua from "../icons/lua.svg";
import IconMercury from "../icons/mercury.svg";
import IconMMIXAL from "../icons/assembly.svg";
import IconModula3 from "../icons/modula3.svg";
import IconMojo from "../icons/mojo.svg";
import IconAssembly from "../icons/assembly.svg";
import IconNim from "../icons/nim.svg";
import IconOberon from "../icons/oberon.svg";
import IconObjectiveC from "../icons/objective-c.svg";
import IconOcaml from "../icons/ocaml.svg";
import IconOctave from "../icons/octave.svg";
import IconPascal from "../icons/pascal.svg";
import IconPerl from "../icons/perl.svg";
import IconPHP from "../icons/php.svg";
import IconProlog from "../icons/prolog.svg";
import IconPython from "../icons/python.svg";
import IconR from "../icons/r.svg";
import IconRacket from "../icons/racket.svg";
import IconRuby from "../icons/ruby.svg";
import IconRust from "../icons/rust.svg";
import IconScala from "../icons/scala.svg";
import IconScheme from "../icons/scheme.svg";
import IconSimula from "../icons/simula.svg";
import IconSmalltalk from "../icons/smalltalk.svg";
import IconSwift from "../icons/swift.svg";
import IconTcl from "../icons/tcl.svg";
import IconTypescript from "../icons/typescript.svg";
import IconV from "../icons/vlang.svg";
import IconVBNET from "../icons/visualstudio.svg";
import IconWASM from "../icons/webassembly.svg";
import IconZig from "../icons/zig.svg";

import { Imogene as $_, ImogeneArray } from './Imogene/Imogene';
/** @jsx $_.make */

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
    title: "Algorithms",
    page: "index.html",
    writings: [
        {
            title: "1. Hello world",
            page: "random_helloworld.html"
        },
        {
            title: "System Setup",
            page: "System-setup.html"
        },
        {
            title: "Gentoo Setup",
            page: "Gentoo-setup.html"
        },
    ]
};

/**
 * Collect the current page hierarchy to create breadcrumbs for
 * @param {string} forPage The page to get breadcrumbs for
 * @returns {(WritingNode|Writings)[]} Array of Writings and WritingNodes representing the current page hierarchy
 */
function breadcrumb(forPage) {
    return ALGORITHMS_PAGES.writings.reduce((arr, book) => {
        if (arr.length > 1)
            return arr;

        if (book.page === forPage) {
            arr.push(book);
        }
        return arr;
    }, [ALGORITHMS_PAGES]);
}

/**
 * Update the breadcrumbs to respect a given path
 * @param {string} pathname The current path to update the breadcrumbs to
 */
function updateBreadcrumbs(pathname) {
    let crumbs = breadcrumb(pathname);
    let crumbsList = $_.find('ol#breadcrumb-list');
    crumbsList.emptyAndReplace(
        ...(crumbs.map(crumb =>
            <li>
                <a href={crumb.page}>
                    {crumb.title}
                </a>
            </li>)));
}

/**
 * Sets the breadcrumbs for the current page
 */
function setBreadcrumbs() {
    let currentPage = `${window.location.pathname}`;
    if (currentPage.slice(-1) === '/') {
        currentPage = currentPage + "index.html"
    }
    updateBreadcrumbs(currentPage);
}

/**
 * Load the sidebar based on the EUCLID_DATA structure
 */
function loadSideBar() {
    let currentPage = `${window.location.pathname}`;
    if (currentPage.slice(-1) === '/') {
        currentPage = currentPage + "index.html"
    }

    let navlist = $_.find('#side-navlist');
    navlist.emptyAndReplace(
        <li class={`home_item ${currentPage === `/${ALGORITHMS_PAGES.page}` ? 'on_page' : ''}`}>
            <a href={currentPage === ALGORITHMS_PAGES.page ? undefined : ALGORITHMS_PAGES.page}
               class="nav_link">
                <span class="material-symbols-outlined home_icon">home</span>
                {ALGORITHMS_PAGES.title}
            </a>
        </li>);

    ALGORITHMS_PAGES.writings.forEach(writing => {
        let listitem_element =
            <li class={currentPage === `/${writing.page}` ? 'on_page' : ""}>
                <a href={writing.page} class="nav_link">
                    {writing.title}
                </a>
            </li>;
        navlist.appendChildren(listitem_element);
    });
}

/**
 * Toggle whether the sidebar is currently collapsed
 */
function toggleCollapsed() {
    const sidebar = $_.find('#sidebar');
    const collapsed = !!sidebar[0].classList.contains('collapsed');
    sidebar.setClassList({ collapsed: !collapsed });

    localStorage.setItem("IsSidebarCollapsed", !collapsed ? "True" : "False");
}

/*
When we load, we need to catch the handler for the side bar
and create the event to toggle whether it is collapsed or expanded
*/
$_.runOnLoad(() => {
    setBreadcrumbs();
    loadSideBar();

    const sidebarCollapser = $_.find('#sidebar-collapser');
    sidebarCollapser.addEvents({
        click: e => { toggleCollapsed(); }
    });

    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const lastValue = localStorage.getItem("IsSidebarCollapsed");
    const sidebar = $_.find('#sidebar');
    if (lastValue !== null) {
        sidebar.setClassList({ collapsed: (lastValue === "True") });
    }
    else {
        sidebar.setClassList({ collapsed: portrait });
        localStorage.setItem("IsSidebarCollapsed", portrait ? "True" : "False");
    }
});
