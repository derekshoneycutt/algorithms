import std.stdio;
import std.conv;

int euclidgcd(int m, int n)
{
    int r = m % n;
    while (r != 0)
    {
        m = n;
        n = r;
        r = m % n;
    }
    return n;
}

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
