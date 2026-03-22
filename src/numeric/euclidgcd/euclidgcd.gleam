import argv
import gleam/format.{printf}
import gleam/int

fn euclidgcd(m: Int, n: Int) -> Int {
    case n {
        0 -> m
        _ -> euclidgcd(n, m % n)
    }
}

fn printgcd(m: Int, n: Int) {
    let gcd = euclidgcd(m, n)
    printf("~b ~b~ngcd: ~b~n", [m, n, gcd])
}

pub fn main() {
    case argv.load().arguments {
        [sm, sn] ->
            case int.parse(sm), int.parse(sn) {
                Ok(m), Ok(n) -> printgcd(m, n)
                _, _ -> printgcd(15, 10)
            }
        _ -> printgcd(15, 10)
    }
}
