#import <Foundation/Foundation.h>
#include <Foundation/NSObjCRuntime.h>
#include <Foundation/NSObject.h>

struct Date {
    int day;
    int month;
    int year;
};

struct Date get_easter_for(int year)
{
    int g = (year % 19) + 1;
    int c = (year / 100) + 1;
    int x = (3 * c / 4) - 12;
    int z = (((8 * c) + 5) / 25) - 5;
    int d = (5 * year / 4) - x - 10;
    int e = ((11 * g) + 20 + z - x) % 30;
    if (((e == 25) && (g > 11)) || (e == 24))
    {
        ++e;
    }
    int n = 44 - e;
    if (n < 21)
    {
        n += 30;
    }
    n += 7 - ((d + n) % 7);

    struct Date ret = {(n > 31) ? n - 31 : n, (n > 31) ? 4 : 3, year};
    return ret;
}

@interface EasterGenerator : NSObject
{
    struct Date currentDate;
    int endYear;
}
- (instancetype)initDates:(NSInteger)start end:(NSInteger)end;
- (bool)next;
- (struct Date)current;
@end

@implementation EasterGenerator

- (instancetype)initDates:(NSInteger)start end:(NSInteger)end {
    self = [super init];
    if (self) {
        currentDate.year = start - 1;
        endYear = end;
    }
    return self;
}

- (bool)next {
    int newYear = currentDate.year + 1;
    if (newYear > endYear)
    {
        return false;
    }
    currentDate = get_easter_for(newYear);
    return true;
}

- (struct Date)current {
    return currentDate;
}

@end

void print_easters(EasterGenerator* easters)
{
    @autoreleasepool {
        NSLog(@"Easters:\n");
        while ([easters next])
        {
            struct Date currDate = [easters current];
            NSLog(@"   %02d %s, %04d\n",
                currDate.day,
                currDate.month == 3 ? "March" : "April",
                currDate.year);
        }
    }
}


int main (int argc, char *argv[])
{
    @autoreleasepool {
        EasterGenerator* easters = [[EasterGenerator alloc] initDates:1950 end:2050];
        print_easters(easters);        
    }

    return 0;
}

