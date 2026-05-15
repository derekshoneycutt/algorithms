/*
    Finds and prints the maximum value of a set of values
*/

// The printer actor, used to find the max and print it to the screen
actor Printer[T : Integer[T] val]
    be printmax(env: Env, values: Array[T] val) =>
        let maxval = try max(values)? else I64(0) end
        for value in values.values() do
            env.out.write(value.string() + " ")
        end
        env.out.print("\nmax: " + maxval.string())

    // The max algorithm
    fun max(values: Array[T] val): T? =>
        var curr = values(0)?
        for value in values.values() do
            if value > curr then
                curr = value
            end
        end
        curr

// The main actor, gets the command line arguments and sends the values to a Printer
actor Main
    new create(env: Env) =>
        let printer = Printer[I64]
        let values: Array[I64] val = recover val
            let arr: Array[I64] = []
            for arg in env.args.slice(1).values() do
                try arr.push(arg.i64()?) end
            end
            if arr.size() < 1 then
                arr.push(15)
                arr.push(10)
            end
            arr
        end

        printer.printmax(env, values)

