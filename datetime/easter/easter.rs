
struct Date {
    year: i32,
    month: i32,
    day: i32
}

fn get_easter_for(year: i32) -> Date {
    let g: i32 = (year % 19) + 1;
    let c: i32 = (year / 100) + 1;
    let x: i32 = (3 * c / 4) - 12;
    let z: i32 = (((8 * c) + 5) / 25) - 5;
    let d: i32 = (5 * year / 4) - x - 10;
    let mut e: i32 = ((11 * g) + 20 + z - x) % 30;
    if (e == 25 && g > 11) || e == 24 {
        e += 1;
    }
    let mut n: i32 = 44 - e;
    if n < 21 {
        n += 30;
    }
    n += 7 - ((d + n) % 7);

    if n > 31 {
        Date {
            year: year,
            month: 4,
            day: n - 31
         }
    }
    else {
        Date {
            year: year,
            month: 3,
            day: n
        }
    }
}

struct Easters {
    start_year: i32,
    end_year: i32
}

struct EastersIterator<'a> {
    current_year: i32,
    collection_ref: &'a Easters
}

impl<'a> Iterator for EastersIterator<'a> {
    type Item = Date;

    fn next(&mut self) -> Option<Self::Item> {
        let new_year: i32 = self.current_year + 1;
        if new_year > self.collection_ref.end_year {
            None
        }
        else {
            self.current_year = new_year;
            Some(get_easter_for(new_year))
        }
    }
}

impl<'a> IntoIterator for &'a Easters {
    type Item = Date;
    type IntoIter = EastersIterator<'a>;

    fn into_iter(self) -> Self::IntoIter {
        EastersIterator {
            current_year: self.start_year - 1,
            collection_ref: self
        }
    }
}

fn print_easters(easters: Easters) {
    println!("Easters:");
    for easter in &easters {
        let month = if easter.month == 3 { "March" } else { "April" };
        println!("   {:02} {}, {}", easter.day, month, easter.year);
    }
}

fn main() {
    print_easters(Easters {
        start_year: 1950,
        end_year: 2050
    })
}
