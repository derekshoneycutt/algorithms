#import <Foundation/Foundation.h>
#include <stdlib.h>

int euclidgcd(int m, int n) {
    int r = m % n;
    while (r != 0) {
        m = n;
        n = r;
        r = m % n;
    }
    return n;
}

int main(int argc, const char * argv[]) {
    int v_1 = 15;
    int v_2 = 10;

    if (argc >= 2) {
        v_1 = atoi(argv[1]);
        v_2 = atoi(argv[2]);
    }

    @autoreleasepool {
        NSLog(@"%d %d", v_1, v_2);
        NSLog(@"gcd: %d", euclidgcd(v_1, v_2));
    }
    return 0;
}
