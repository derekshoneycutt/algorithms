# Derek's Algorithms VS Code Extension

This contains a Visual Studio Code extension for use with the overall algorithms project.

This originally began from simultaneously thinking about creating such an extension and
deciding to try various more vibe-coding style things with the AI.

I am wholly unimpressed with the AI.

That said, this current version is basically structurally coded by myself with AI filling
in the gaps. I did carry some code that was useful enough from old versions. I let AI go
on some of the minutea still. I was able to prevent it from making some of the same stupid
mistakes that it made the last 2 times, but there's probably some room for cleanup and
optimization in that minutea that I let it go, if my experience says anything.

The first version of this was just outright, "Hey, AI, make this vscode extension," in a
handful of prompts. The code was atrocious, but yes, it worked. The fact that it worked
anywhere near as well as it did was probably partially because I am an experienced
engineer.

The second version of this extension was trying to create a strong architectural guidance
and force AI into it. Via copilot and others, I tried multiple models out, seeing what
could come of it. The result was a better working extension, but as I used it actively in
this project, it quickly became apparent that it was weak. It was kind of obvious to me
that it would be because the AI continually refused to actually do the architecture I
originally wanted, instead creating yet another module to treat the smallest thing as yet
another whole new feature, and so I ended up with some kind of half-assed attempt at it
that the AI was willing to do after far too many prompts, with complexity way too high
in structure.

This is the third version. The third version, named 0.3.0 as such, I largely hand coded
the basic interfaces and let the AI go underneath that instead. I wrote parts of it myself,
but this extension is still an exercise in what I can get AI to do worth a shit. This is
very much so no longer just AI. It's at least half me forcing the code into a way I would
have coded myself much faster and still much better, without AI.

That said, this is much better. We can still improve it if we want. It's not as much
vibecode as it used to be. It's a hybrid monster now. Better but also still a lil slop.

## Architecture

This follows the predictable VS Code Extension structure using Typescript to start. From
there, there are 2 major modules and 4 state actors that operate the extension. Each of
these is created in `activate` and passed to each other in constructors as needed in the
form of an interface, allowing a very dependency-injection like approach for the modules
to speak to one another.

This dependency graph and their responsibilities leads to a kind of sandwhiched lattice
of sorts. On the bottom is the `ILanguages` structure. On the top is the `IViews`
structure. Between them are the 4 independent stateful actors with unique runtime
responsibilities, `IEnvironment`, `ITracker`, `IRunner`, and `ISmoker`. Let's begin
explaining this lattice from the major modules on bottom at top.

Dependency graph:

```text
ILanguages
 |.
 |'- IEnvironment
 |    |
 |    |  ITracker  
 |.   |.  |.
 |'---+'--+'- IRunner
 |.   |.  |.   |
 |'---+'--+'---+- ISmoker
 |.   |.  |.   |.  |.
 ''---''--''---''--''- IViews
```

### `ILanguages` Core

The `ILanguages` structure provides the primary means of understanding algorithm source
code within the project. This includes a script generated language definitions file, as
well as utilities for flagging languages and checking for workspace support for the
project. All other modules access these functions through the central `ILanguages`
interface, which is the idiomatic pattern for this project.

`Languages` has no dependencies on any other modules, so all modules are free to request
an `ILanguages` in their constructors and call methods to get the algorithm and standard
library file trees, available languages, and create and delete files and folders in the
algorithms and standard library trees. The module also includes a file watcher internally
and will bubble events via `subscribeToDataChanges` hooks for both intentionally created
changes and changes noticed by the file watcher.

This module serves as the source of truth for both the Algorithms and Standard Library
Tree Views. Filesystem tree is cached in memory to reduce filesystem overhead. This will
return all available languages in the structure, with flags indicating how many actual
files exist for the language. Files outside of the supported languages or doc types (.md
and .txt) will be ignored by this module.

In both prior versions, for some reason, the AI simply refused to just build me a language
module that did anything more than serve as a wrapper around the generated catalogue. It
offered to create a separate filesystem module and other things for all this instead, and
created a mess of things when I did try to force it. By coding the interfaces with the
functionality first, I was able to get the AI to follow the coherent idea of this module.
That said, now it just put most of it into the single Languages class file instead of
considering any composition that could maybe make some of it easier to read. At 1550 lines,
it is manageable and at least pretty clearly a catalogue not just of the supported
languages but of their state in terms of actual files on the harddrive, which fits the
entire point of this project better than whatever the AI was throwing a fit about in prior
versions of this extension.

### `IViews` Providers

The `Views` module is easily the largest module and sits at the top of the stack of all
modules. This includes node-side handling for all views, serving the primary function for
the treeviews in that space. The 3 webviews are loaded via HTML templates with triple
curly bracket placeholders. The `Views` module also contains the hooks into context menus
in Explorer and the Editor Title Actions menus.

Each of the 5 views follow the same pattern. There is the VSCode standard data provider
implementer for the type of view (webview vs treeview). However, this project wraps that
in a basic custom class for each view. In the tree views, this "wrapper" becomes far more
than a wrapper, serving coordination for major parts of the behavior for the views as well.
In the web views, these end up really looking just like small wrappers, as even the data
providers do little more than load the template HTML via a shared template loader, and
these classes have little to do but construct the provider and subscribe to events between
state actors and the providers.

The frontend webviews are built utilizing Lit for easy, lightweight component style
programming. The client side scripting is done also in Typescript first, with clear
separation into components beyond the initial entry point. The client-side avoids holding
state beyond the HTML, instead simply messaging all updates down to the backend, where it
is stored in one of the stateful actors, depending on the view. There is a standard
debounce used across all webviews, preventing a flood of messaging into the backend state
actors while users are typing.

The Algorithms Tree View is quite involved, speaking to the Languages module, as well as
displaying state information and requesting work with Runner, Smoker, and Tracker actors.
That said, most of it is simply providing the view-side, relying on the stateful actors
for the state, including subscribing to changes and bubbling them into the treeview as
appropriate. This is kind of central view of the whole extension, offering the core
functionality, so there is a lot going on there.

The first attempt at the view structure was basically tightly coupled with every other
function of the extension as the AI just given loose prompts about making an extension
went off and wrote an intense amount of spaghetti code. The second attempt had to be
coerced into using Lit for some reason, and following the AI complaints about needing
more modules, I let it over-engineer an entire frontend comms-bridge-ui structure that I
continually looked at wondering why there was so much code doing nothing. The Views is
still a very large module, as 5 view panels plus the extra context menus and buttons
can really only be made so compact. The component structure in the webviews actually takes
more files than the older code used to, but it looks more obvious and not just layers of
code that do nothing around one massive code file for each webview like prior versions
experienced without tighter control on the AI.

The `IViews` interface does not expose any methods or subscriptions for other modules. It
intentionally sits at the top of the stack. The interface is mostly just an idiomatic
formality for this project.

### The Stateful Actors

The stateful actors sit between the Languages and Views modules. Each of these modules
wraps around an XState Actor. Thus the naming them Actors. Some also perform some actions
based on specific input.

This is one of the larger changes from prior versions the AI made for me. I largely just
told it to carry the state on the backend, and this resulted in it making a big central
state machine holding everything. The use of XState's actor model was really quite
incoherent upon inspection. Thus, these 4 modules serve as a kind of breaking up of the
single large central state machine of the previous versions. They each end up also taking
on responsibilities for what was previously called the "Conductor" module, as their
purpose aligned quite well along both state and function. Some other modules were broken
up and folded into the different actors along the way as well. The result is a simpler but
somehow stronger architecture, and one that better follows XState's actor model.

#### `IEnvironment` Actor

I tried to come up with some clever name like "Runner" and "Smoker" for `Environment`, but
alas, they all just sounded more lame and less descriptive than just staying with
`Environment`. This module is a stateful actor, although unlike the other actors, it
persists its state into the users shell profile file. This can be specified by the user,
or it will try to use defaults.

The `ProfileHandler` class was added as a kind of refactor of prior separated code to
handle the user's shell profile file. This just reads and writes environment variables in
the file. This is used to persist the specific set of values, and these values are
used by the run script.

The `InitHandler` is the first in this document that manages running a shell command. In
this case, Environment has a couple of `init.sh` calls for copying icons and running the
environment test. This was previously broken up across like 3 modules, and having it all
in a central space is quite a lot easier to manage.

The state in `Environment` also contains runtime values indicating if the views should
persist values across VSCode sessions, and if the Algorithms and Standard Library tree
views should include edit features to create and delete files and folders. More such
values may be added in the future.

#### `ITracker` Actor

Next up in the dependency graph is the `ITracker` actor. This is the simplest actor, in
one sense. It simply keeps a state record of how code files are running or have been run
by the system. This is the core of how the Algorithms tree view is able to show queued,
running, failed, cancelled, and successful executions of code within the project.

This piece was not really in the prior versions in this form. It kind of existed in the
state machine but not as formally or well. This single actor now makes a very strong,
coherent system for tracking runs, both individual and smoke runs.

#### `IRunner` Actor

The Runner actor follows quite obviously. This is a somewhat interesting one because it
holds the state from the Run Controls webview, which dictate exactly how runs are
performed. It has the `RunHandler` internally that calls the `run.sh` script in a user
visible terminal, watching and updating an `ITracker` handle with the state of the run.

Launching things in a terminal or not was a consistent hot spot in both prior versions of
the code. The AI kept making a bunch of spaghetti code or overengineered nonsense in both
versions, and I am not entirely sure that `RunHandler` does not remain a little bit
overengineered inside. It works well enough for my current acceptance, but... maybe I will
spend some time in it later.

#### `ISmoker` Actor

The name Smoker was kind of an accident, but it actually is a good fit, being that it is
the actor in charge of knowing how to initiate a smoke run so that the `ITracker` is
updated with the results. The state is the information from the Run Controls web view, and
it uses the `SmokeHandler` class internally to launch a smoke test and update the
`ITracker` state with statuses.

About side-eyeing what the AI is doing, somehow the smoke run code in `SmokeHandler` is
a lot simpler and smaller than the run code in `RunHandler`. This might make more sense
than is intuitive at first, as there are a lot more options for the run handler to figure
out how to parse together than the smoke handler. Nonetheless, these are probably in the
hotspots to consider if I want to look more critically at what the AI did in the future.

`run.sh` is a complex run script, designed to provide the same system at command line that
this extension provides in vscode. Along with `init.sh`, these scripts were in fact the
prototype for this extension. I hand coded the vast majority of the shell script, with
some snippets coming from searches probably powered by AI and that I am willing to live
with in that part.
