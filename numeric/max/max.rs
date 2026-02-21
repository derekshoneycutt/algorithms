
fn max(list: &Vec<i64>) -> i64 {
    let mut current: i64 = 0;
    for value in list {
        if *value > current {
            current = *value;
        }
    }
    return current;
}

fn main() {
    let args: Vec<_> = std::env::args().collect();
    let mut list: Vec<i64> = Vec::new();

    if args.len() > 1 {
        for arg in args.iter().skip(1) {
            list.push(arg.parse().expect("Bad value in input."));
        }
    }
    else {
        list.push(15);
        list.push(10);
    }

    let max_value = max(&list);

    println!("values: {:?}", list);
    println!("max: {}", max_value);
}
