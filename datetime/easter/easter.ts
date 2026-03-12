
function get_easter_for(year : number) : Date {
    let g = (year % 19) + 1;
    let c = Math.trunc(year / 100) + 1;
    let x = Math.trunc(3 * c / 4) - 12;
    let z = Math.trunc(((8 * c) + 5) / 25) - 5;
    let d = Math.trunc(5 * year / 4) - x - 10;
    var e = ((11 * g) + 20 + z - x) % 30;
    if (((e == 25) && (g > 11)) || (e == 24))
    {
        ++e;
    }
    var n = 44 - e;
    if (n < 21)
    {
        n += 30;
    }
    n += 7 - ((d + n) % 7);

    if (n > 31) {
        return new Date(year, 3, n - 31);
    }
    return new Date(year, 2, n);
}

function* get_easters(startYear : number, endYear : number) : Generator<Date, void, any> {
    for (var year = startYear; year <= endYear; ++year){
        yield get_easter_for(year);
    }
}

function print_easters(easters : Iterable<Date>) {
    console.log("Easters:");
    var pad = (n : number) => n.toString().padStart(2, '0');
    for (const easter of easters) {
        console.log(`   ${pad(easter.getDate())} ${
            easter.getMonth() == 2 ? "March" : "April"}, ${
            easter.getFullYear()}`);
    }
}

print_easters(get_easters(1950, 2050));
