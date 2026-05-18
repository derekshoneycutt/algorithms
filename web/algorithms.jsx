import '@material/web/fab/fab.js';
import '@material/web/icon/icon.js';
import './style.scss';

import SocialHeadPng from "./socialhead.png";
import IconActon from "../icons/acton.svg";
import IconAda from "../icons/ada.svg";
import IconApl from "../icons/apl.svg";
import IconBallerina from "../icons/ballerina.svg";
import IconC from "../icons/c.svg";
import IconC3 from "../icons/c3.svg";
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
import IconIo from "../icons/io.svg";
import IconJ from "../icons/j.svg";
import IconJava from "../icons/java.svg";
import IconJavascript from "../icons/javascript.svg";
import IconJoy from "../icons/joy.svg";
import IconJulia from "../icons/julia.svg";
import IconKit from "../icons/kit.svg";
import IconKotlin from "../icons/kotlin.svg";
import IconLisp from "../icons/lisp.svg";
import IconLLVMIR from "../icons/llvm.png";
import IconLua from "../icons/lua.svg";
import IconMercury from "../icons/mercury.svg";
import IconMMIXAL from "../icons/assembly.svg";
import IconModula3 from "../icons/modula3.svg";
import IconMojo from "../icons/mojo.svg";
import IconAssembly from "../icons/assembly.svg";
import IconNial from "../icons/nial.svg";
import IconNim from "../icons/nim.svg";
import IconOberon from "../icons/oberon.svg";
import IconObjectiveC from "../icons/objective-c.svg";
import IconOcaml from "../icons/ocaml.svg";
import IconOctave from "../icons/octave.svg";
import IconOdin from "../icons/odin.svg";
import IconPascal from "../icons/pascal.svg";
import IconPerl from "../icons/perl.svg";
import IconPHP from "../icons/php.svg";
import IconPLI from "../icons/pli.svg";
import IconPony from "../icons/pony.svg";
import IconProlog from "../icons/prolog.svg";
import IconPython from "../icons/python.svg";
import IconR from "../icons/r.svg";
import IconRacket from "../icons/racket.svg";
import IconRaku from "../icons/raku.svg";
import IconRhombus from "../icons/rhombus.svg";
import IconRuby from "../icons/ruby.svg";
import IconRust from "../icons/rust.svg";
import IconScala from "../icons/scala.svg";
import IconScheme from "../icons/scheme.svg";
import IconSelf from "../icons/self.svg";
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
