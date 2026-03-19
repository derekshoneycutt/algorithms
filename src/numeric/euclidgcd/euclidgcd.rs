fn euclidgcd(m_in: i64, n_in: i64) -> i64 {
    let mut m = m_in;
    let mut n = n_in;
    let mut r;
    while n != 0 {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

fn main() {
    let args: Vec<_> = std::env::args().collect();

    let m = if args.len() >= 3 {
         args[1].parse().expect("Bad value in input 1.") }
         else { 15 };
    let n = if args.len() >= 3 {
         args[2].parse().expect("Bad value in input 2.") }
         else { 10 };

    println!("{} {}", m, n);
    println!("gcd: {}", euclidgcd(m, n));
}
