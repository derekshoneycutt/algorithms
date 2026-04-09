//! Calculates the GCD for two values and prints it all to the screen

const std = @import("std");

/// Calculates the GCD of two values using Euclid's algorithm.
/// 
/// Parameters
/// -----------
/// - `m_in` : The first value to compute the GCD for.
/// - `n_in` : The second value to compute the GCD for.
/// 
/// Returns
/// -----------
/// The calculated GCD value.
fn euclidgcd(m_in: i32, n_in: i32) i32 {
    var r: i32 = 0;
    var m = m_in;
    var n = n_in;
    while (n != 0) {
        r = @rem(m, n);
        m = n;
        n = r;
    }
    return m;
}

/// The main entry point of the application
pub fn main(init: std.process.Init) !void {
    // We need an allocator to pull the command line arguments in Zig
    var gpa = std.heap.DebugAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    // pull the command line arguments into a new array
    var args = try init.minimal.args.iterateAllocator(allocator);
    defer args.deinit();
    _ = args.next();

    // if we have 2+ arguments, try to parse them into m and n or fall back to 15, 10
    var m: i32 = 15;
    var n: i32 = 10;
    if (args.next()) |arg1| {
        m = std.fmt.parseInt(i32, arg1, 10) catch 15;
        if (args.next()) |arg2| {
            n = std.fmt.parseInt(i32, arg2, 10) catch 10;
        }
    }

    const gcd = euclidgcd(m, n);

    std.debug.print("{} {}\ngcd: {}\n", .{ m, n, gcd });
}
