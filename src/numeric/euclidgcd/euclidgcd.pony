/*
    Determines the gcd between two values and prints it
*/

// The printer actor, used to calculate and print the GCD
actor Printer
    be printgcd(env: Env, m: I64, n: I64) =>
        env.out.print(m.string() + " " + n.string() + "\ngcd: " + gcd(m, n).string())

    fun gcd(min: I64, nin: I64): I64 =>
        var m = min
        var n = nin
        while n != 0 do
            let r = m % n
            m = n
            n = r
        end
        m

// The main actor, entry point to the application
actor Main
    new create(env: Env) =>
        let m: I64 = try
            env.args(1)?.i64()?
        else
            15
        end
        let n: I64 = try
            env.args(2)?.i64()?
        else
            10
        end

        let printer = Printer
        printer.printgcd(env, m, n)

