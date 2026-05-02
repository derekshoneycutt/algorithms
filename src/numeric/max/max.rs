/*
 *  Get the maximum value of a sequence of values
 */

/// Get the maximum value from a collection
/// 
/// # Arguments
/// + `list` - The values to get the maximum for
/// 
/// # Returns
/// The maximum value from the collection.
fn max<T: Ord + Copy>(list: &[T]) -> T {
    let mut current: T = list[0];
    for &value in list.iter().skip(1) {
        if value > current {
            current = value;
        }
    }
    return current;
}

/// The main entry point to the application
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
