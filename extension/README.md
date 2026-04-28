# Derek's Algorithms VS Code Extension

This directory maintains a dedicated VS Code extension for the algorithms project,
basically making a small IDE out of VS Code, wrapping around the run.sh and init.sh
scripts for the project.

Please review documentation in docs/ for appropriate architecture and coding standards
for this extension.

- [Coding Standards](docs/CodingStandards.md)
- [Architecture Summary](docs/ArchitectureSummary.md)
- [Dependency Contracts](docs/DependencyContracts.md)
- docs/specs sheets for specific behaviors

Basically the only reason this extension exists is because this entire project began
in between jobs. While staring at every other job listing and interview asking me about
my demonstrable history using AI tools for coding, I came to the conclusion to at least
try it out fully. The first version of this extension was really my first attempt at
using AI coding tools. It was in Javascript and started with just simple prompting,
asking the AI to read my existing scripting and build a VS Code Extension based on it.

The existing code reference, I have learned, did help keep it specifically on track to
the point of having entirely usable code. However, as I kept looking at the code, I kept
being annoyed at the plethora of code smells, and after about my 8th attempted refactor,
I decided to just re-code the entire thing from scratch using Typescript and strict
architectural and style guidance.

Over the course of a couple days, I used skills for planning and adversarial looping over
AI generated results to force the AI to develop somewhat better code. I basically became a
power user of these AIs in a week to try and see if I could get it any better. As I look
over it, it's still got some pretty clear issues. I regularly had to stop it and redirect
it back to the architecture and standards, even within a single planned unit sometimes.
This struggle still shows up in the code, and at times the AI just does incredibly naive things
that I was just able to work with. At first, the entire UI layer was a freakish mix of Lit
and vanilla JS/DOM, complete with the kinds of bugs you'd expect from such a terrible application.
Because it looked like it used Lit at first, it took me a closer inspection to realize what
was happening and direct the AI agent to fix it correctly. This just being one example of the
kinds of difficulties that still came up even with strong architecture and planning guidance.

The entire point of this algorithms project would be utterly defied by taking AI coding
tools to it, so I can promise this extension is the only piece of this project that uses
AI coding. I do feel the circumstances of starting this whole project as kind of a sabbatical
from work fit me using a VS Code Extension for it to explore the AI coding tools that jobs
are so increasingly insistent about as companies desperately seek to justify spending so
much money on the things before finding an actually good use for them.

I do use this extension regularly as I navigate and work on algorithms within this project.
I find it quite a helpful extension now. However, my experience has left me with nothing
but disdain for AI "tools". Getting code that's remotely better than I wrote in middle school
out of these things is the most abysmal programming I've ever done in my life.

Although I feel comfortable arguing it makes sense to try a project with this AI stuff given
my position being between jobs and being asked so much about how I'm going to bring experience
with them into my next job, I am largely on the side that we would be better off without them.
The only point I see any sense in the current push about AI coding is lazy, not-that-great
programmers finally being able to feel like the stronger devs they used to praise instead of
write piles of slop sadly pretending to mimic, and businesses who spent millions of dollars on it
and now have no choice to but create some justification for that spend to their shareholders.
