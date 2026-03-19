#include <print>
#include <cstdlib>

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

int main(int argc, char *argv[])
{
    int m = 15;
    int n = 10;

    if (argc >= 3)
    {
        m = std::stoi(argv[1]);
        n = std::stoi(argv[2]);
    }

    std::println("{} {}", m, n);
    std::println("gcd: {}", euclidgcd(m, n));

    return 0;
}
