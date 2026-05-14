/*
    Prints hello world to the screen
*/

// The main actor, entry point to the application
actor Main
    new create(env: Env) =>
        env.out.print("Hello, world!")
