#include <stdio.h>
#include <stdlib.h>

int max(int x[], int n)
{
    int current = 0;
    for (int i = 0; i < n; ++i)
    {
        if (x[i] > current)
        {
            current = x[i];
        }
    }
    return current;
}


int main(int argc, char *argv[])
{
    int n;
    int* values;

    if (argc > 1)
    {
        values = (int*)malloc(sizeof(int) * argc - 1);
        for (int i = 0; i < argc - 1; ++i)
        {
            values[i] = atoi(argv[i + 1]);
        }
        n = argc - 1;
    }
    else
    {
        values = (int*)malloc(sizeof(int) * 2);
        values[0] = 15;
        values[1] = 10;
        n = 2;
    }

    int pmax = max(values, n);

    printf("values:\n");
    for (int i = 0; i < n; ++i)
    {
        printf("%d\n", values[i]);
    }
    printf("max: %d\n", pmax);

    free(values);
}

