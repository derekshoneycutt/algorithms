import std.stdio;
import std.conv;

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
