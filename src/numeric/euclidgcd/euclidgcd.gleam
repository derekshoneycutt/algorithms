//// This program takes 2 values, calculates the GCD, and prints it all to the screen
import argv
import gleam/format.{printf}
import gleam/int

/// Calculates the GCD betwen m and n using Euclid's method
fn euclidgcd(m: Int, n: Int) -> Int {
    case n {
        0 -> m
        _ -> euclidgcd(n, m % n)
    }
}

/// Calculates and prints the gcd of m and n
fn printgcd(m: Int, n: Int) {
    let gcd = euclidgcd(m, n)
    printf("~b ~b~ngcd: ~b~n", [m, n, gcd])
}

/// The main entry point to the application
pub fn main() {
    // Try to take the first 2 command line parameters,
    // or use 15, 10
    case argv.load().arguments {
        [sm, sn] ->
            case int.parse(sm), int.parse(sn) {
                Ok(m), Ok(n) -> printgcd(m, n)
                _, _ -> printgcd(15, 10)
            }
        _ -> printgcd(15, 10)
    }
}
