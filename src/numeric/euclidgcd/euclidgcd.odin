/*
    Prints hello world to the screen
*/
package main

import "core:fmt"
import "core:os"
import "core:strconv"

// Calculate the GCD via Euclid's algorithm
euclidgcd :: proc(m_in, n_in: int) -> int {
    m := m_in
    n := n_in
    r := 0
    for n != 0 {
        r = m % n;
        m = n;
        n = r;
    }
    return m
}

// The main entry point to the application
main :: proc() {
    m := 15
    n := 10
    ok: bool
    if (len(os.args) > 2) {
        m, ok = strconv.parse_int(os.args[1]);
        if !ok { 
            m = 15
        }
        n, ok = strconv.parse_int(os.args[2]);
        if !ok {
            n = 10
        }
    }
    gcd := euclidgcd(m, n)

	fmt.println(m, " ", n, "\ngcd: ", gcd)
}