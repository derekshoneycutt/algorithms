import Foundation

func get_easter_for(year: Int) -> Date {
    let g = (year % 19) + 1
    let c = (year / 100) + 1
    let x = (3 * c / 4) - 12
    let z = (((8 * c) + 5) / 25) - 5
    let d = (5 * year / 4) - x - 10
    var e = ((11 * g) + 20 + z - x) % 30
    if (e == 25 && g > 11) || e == 24 {
        e += 1
    }
    var n  = 44 - e
    if n < 21 {
        n += 30
    }
    n += 7 - ((d + n) % 7)

    var components = DateComponents()
    components.year = year
    components.month = 3
    components.day = n
    if n > 31 {
        components.day = n - 31
        components.month = 4
    }
    let calendar = Calendar.current
    if let date = calendar.date(from: components) {
        return date
    }
    return Date()
}

struct Easters: Sequence, IteratorProtocol {
    private var current: Int
    private var endYear: Int

    init(start: Int, endYear: Int) {
        self.current = start - 1
        self.endYear = endYear
    }

    mutating func next() -> Date? {
        let nextYear = current + 1
        guard nextYear <= endYear else {
            return nil
        }
        current = nextYear
        return get_easter_for(year: current)
    }

    func makeIterator() -> Easters {
        self
    }
}

func print_easters(easters: Easters) {
    print("Easters:")
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "   dd MMMM, yyyy"
    dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    for easter in easters {
        print(dateFormatter.string(from: easter))
    }
}

print_easters(easters: Easters(start: 1950, endYear: 2050))
