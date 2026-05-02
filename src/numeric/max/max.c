/*
 *  Get the maximum value of a sequence of values
 */

 #include <stdio.h>
#include <stdlib.h>

/**
 * Get the maximum integer from an array of integers
 * 
 * @param x The array of integers to get the max of
 * @param n The number of integers to find the max for
 * @return The maximum value
 */
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

/**
 * The main entry point to the application
 * 
 * @param argc The number of arguments on the command line
 * @param argv The array of command line arguments given
 * @returns 0
 */
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

