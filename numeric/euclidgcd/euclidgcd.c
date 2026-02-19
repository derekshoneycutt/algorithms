#include <stdio.h>
#include <stdlib.h>

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
        m = atoi(argv[1]);
        n = atoi(argv[2]);
    }

    printf("%d %d\ngcd: %d\n", m, n, euclidgcd(m, n));

    return 0;
}
