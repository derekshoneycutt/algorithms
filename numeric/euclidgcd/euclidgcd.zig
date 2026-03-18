const std = @import("std");

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

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    var m: i32 = 15;
    var n: i32 = 10;

    if (args.len > 2) {
        m = std.fmt.parseInt(i32, args[1], 10) catch 15;
        n = std.fmt.parseInt(i32, args[2], 10) catch 10;
    }

    const gcd = euclidgcd(m, n);

    std.debug.print("{} {}\ngcd: {}\n", .{ m, n, gcd });
}
