/*
 *  Calculate the GCD between 2 values and print it all to the screen
 */
import std.stdio;
import std.conv;

/++
 + Calculate the GCD with Euclid's method.
 +
 + Params:
 +  m = The first value to calculate GCD for
 +  n = The second value to calculate GCD for
 + Returns: The GCD for the two values
 +/
int euclidgcd(int m, int n)
{
    int r = 0;
    while (n != 0)
    {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

/++
 + Main entry point to the application
 +
 + Params:
 +  args = The command line arguments passed to the application
 +/
void main(string[] args)
{
    int m = 15, n = 10;
    if (args.length > 2)
    {
        m = to!int(args[1]);
        n = to!int(args[2]);
    }

    writeln(m, " ", n);
    writeln("gcd: ", euclidgcd(m, n));
}
