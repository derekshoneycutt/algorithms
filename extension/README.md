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
originally wanted, and so I ended up with some kind of half-assed attempt at it that the
AI was willing to do after far too many prompts.

This is the third version. The third version, named 0.3.0 as such, I largely hand coded
the basic interfaces and let the AI go underneath that instead. I wrote parts of it myself,
but this extension is still an exercise in what I can get AI to do worth a shit. This is
very much so no longer just AI. It's at least half me forcing the code into a way I would
have coded myself much faster and still much better, without AI.

That said, this is much better. We can still improve it if we want. It's not as much
vibecode as it used to be. It's a hybrid monster now. Better but also still a lil slop.
