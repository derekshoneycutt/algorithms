use std::env;

fn euclidgcd(m: i32, n: i32) -> i32 {
    let mut m_mut: i32 = m;
    let mut n_mut: i32 = n;
    let mut r: i32 = m_mut % n_mut;
    while r != 0 {
        m_mut = n_mut;
        n_mut = r;
        r = m_mut % n_mut;
    }
    return n_mut;
}


fn main() {
    let args: Vec<String> = env::args().collect();

    let v_1: i32 = if args.len() >= 2 {
         args[0].parse().expect("Bad value in input 1.") }
         else { 15 };
    let v_2: i32 = if args.len() >= 2 {
         args[1].parse().expect("Bad value in input 2.") }
         else { 10 };

    println!("{} {}", v_1, v_2);
    println!("{}", euclidgcd(v_1, v_2));
}