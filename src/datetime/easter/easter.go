package main

import (
	"fmt"
	"time"
)

func get_easter_for(year int) time.Time {
	var g int = (year % 19) + 1
	var c int = (year / 100) + 1
	var x int = (3 * c / 4) - 12
	var z int = (((8 * c) + 5) / 25) - 5
	var d int = (5 * year / 4) - x - 10
	var e int = ((11 * g) + 20 + z - x) % 30
	if ((e == 25) && (g > 11)) || (e == 24) {
		e++
	}
	var n int = 44 - e
	if n < 21 {
		n += 30
	}
	n += 7 - ((d + n) % 7)

	var ret time.Time
	if n > 31 {
		ret = time.Date(year, time.April, n-31, 0, 0, 0, 0, time.UTC)
	} else {
		ret = time.Date(year, time.March, n, 0, 0, 0, 0, time.UTC)
	}
	return ret
}

func get_easters(startYear, endYear int) <-chan time.Time {
	ch := make(chan time.Time)
	go func() {
		for year := startYear; year <= endYear; year++ {
			ch <- get_easter_for(year)
		}
		close(ch)
	}()
	return ch
}

func print_easters(easters <-chan time.Time) {
	fmt.Println("Easters:")
	for easter := range easters {
		fmt.Printf("   %s\n", easter.Format("02 January, 2006"))
	}
}

func main() {
	print_easters(get_easters(1950, 2050))
}
