#import <Foundation/Foundation.h>
#include <stdlib.h>

int euclidgcd(int m, int n) {
    int r = 0;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

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
