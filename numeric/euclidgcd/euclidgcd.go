package main

import (
	"fmt"
	"os"
	"strconv"
)

func euclidgcd(m int, n int) int {
	var r int = m % n
	for r != 0 {
		m = n
		n = r
		r = m % n
	}
	return n
}

func main() {
	var v_1 int = 15
	var v_2 int = 10
	var err error

	if len(os.Args) >= 2 {
		v_1, err = strconv.Atoi(os.Args[1])
		v_2, err = strconv.Atoi(os.Args[2])
	}

	if err != nil {
		fmt.Println("An error happened")
	}

	fmt.Println(v_1, " ", v_2)
	fmt.Println("gcd: ", euclidgcd(v_1, v_2))
}
