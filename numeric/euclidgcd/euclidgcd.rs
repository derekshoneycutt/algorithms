fn euclidgcd(m: i64, n: i64) -> i64 {
    let mut m_mut = m;
    let mut n_mut = n;
    let mut r = m_mut % n_mut;
    while r != 0 {
        m_mut = n_mut;
        n_mut = r;
        r = m_mut % n_mut;
    }
    return n_mut;
}

fn main() {
    let args: Vec<_> = std::env::args().collect();

    let v_1 = if args.len() >= 2 {
         args[1].parse().expect("Bad value in input 1.") }
         else { 15 };
    let v_2 = if args.len() >= 2 {
         args[2].parse().expect("Bad value in input 2.") }
         else { 10 };

    println!("{} {}", v_1, v_2);
    println!("gcd: {}", euclidgcd(v_1, v_2));
}
