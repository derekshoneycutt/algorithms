/*
    This program takes an array of values and outputs the maximum value of those
*/

#import <Foundation/Foundation.h>
#include <stdlib.h>

/**
 * Get the maximum value from an array of integers.
 *
 * @param values An array of integers.
 * @param count The number of elements in the array.
 * @return The maximum value in the array.
 */
int max(int values[], int count) {
    int current = 0;
    for (int i = 0; i < count; ++i) {
        if (values[i] > current) {
            current = values[i];
        }
    }
    return current;
}

/**
 * @brief The main entry point for the application
 *
 * @param argc The number of command line arguments called with the app
 * @param argv The command line arguments, as a string array
 */
int main(int argc, const char * argv[]) {
    int n;
    int* values;

    if (argc > 1)
    {
        values = (int*)malloc(sizeof(int) * (argc - 1));
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

    @autoreleasepool {
        NSLog(@"values:");
        for (int i = 0; i < n; ++i) {
            NSLog(@"%d", values[i]);
        }
        NSLog(@"gcd: %d", pmax);
    }

    free(values);

    return 0;
}
