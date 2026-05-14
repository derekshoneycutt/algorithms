/*
 *  Get the maximum value of a sequence of values
 */
#include <stdio.h>
#include <stdlib.h>

/**
 * A generic value type for use with the max function
 */
typedef void* value_t;

/**
 * A comparison function type for use with the max function
 */
typedef int (*cmp_func)(const value_t, const value_t);

/**
 * A value type for integers
 */
typedef int* intvalue_t;

/**
 * Get the maximum value from an array of values of some type
 * 
 * @param values The array of values to get the max of
 * @param n The number of values to find the max for
 * @param size The size of the data type in the variable
 * @param cmp A comparison function that returns a positive value if the first argument is greater than the second, zero if they are equal, and a negative value if the first argument is less than the second
 * @return The maximum value
 */
value_t max(const value_t values, const size_t n, const size_t size, const cmp_func cmp)
{
    // pointer math is a lil dangerous...
    value_t current = (value_t)values;
    for (size_t i = 1; i < n; ++i)
    {
        value_t element = (value_t)((char*)values + i * size);
        if (cmp(element, current) > 0)
        {
            current = element;
        }
    }
    return current;
}

/**
 * Compare two integers from 2 const value_t pointers
 * 
 * @param a The first integer to compare
 * @param b The second integer to compare
 * @return A positive value if a > b, zero if a == b, and a negative value if a < b
 */
int cmp_int(const value_t a, const value_t b)
{
    // those are ints, right? right...
    int int_a = *(intvalue_t)a;
    int int_b = *(intvalue_t)b;
    return int_a - int_b;
}

/**
 * The main entry point to the application
 * 
 * @param argc The number of arguments on the command line
 * @param argv The array of command line arguments given
 * @returns 0
 */
int main(const int argc, const char *argv[])
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

    int pmax = *(intvalue_t)max(values, n, sizeof(int), cmp_int);

    printf("values:\n");
    for (int i = 0; i < n; ++i)
    {
        printf("%d\n", values[i]);
    }
    printf("max: %d\n", pmax);

    free(values);
}

