#include <stdio.h>
#include <stdlib.h>

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

int main(int argc, char *argv[])
{
    int v_1 = 10;
    int v_2 = 15;

    if (argc >= 2)
    {
        v_1 = atoi(argv[1]);
        v_2 = atoi(argv[2]);
    }

    printf("%d %d\n%d\n", v_1, v_2, euclidgcd(v_1, v_2));

    return 0;
}
