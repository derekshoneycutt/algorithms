#import <Foundation/Foundation.h>
#include <stdlib.h>

int max(int values[], int count) {
    int current = 0;
    for (int i = 0; i < count; ++i) {
        if (values[i] > current) {
            current = values[i];
        }
    }
    return current;
}

int main(int argc, const char * argv[]) {
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
