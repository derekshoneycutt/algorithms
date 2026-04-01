/*
    Calculates the GCD for two values and prints it all to the screen
*/
#import <Foundation/Foundation.h>
#include <stdlib.h>

/**
 * Calculates the GCD for two values with Euclid's method
 *
 * @param m The first value to calculate the GCD for
 * @param n The second value to calculate the GCD for
 * @return The calculated GCD
 */
int euclidgcd(int m, int n) {
    int r = 0;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

/**
 * @brief The main entry point for the application
 *
 * @param argc The number of command line arguments called with the app
 * @param argv The command line arguments, as a string array
 */
int main(int argc, const char * argv[]) {
    int m = 15;
    int n = 10;

    if (argc >= 2) {
        m = atoi(argv[1]);
        n = atoi(argv[2]);
    }

    @autoreleasepool {
        NSLog(@"%d %d", m, n);
        NSLog(@"gcd: %d", euclidgcd(m, n));
    }
    return 0;
}
