(use-modules (ice-9 format))

(define (lazy-filter pred ls)
    (if (null? ls)
        '()
        (let ((obj (car ls)))
             (if (pred obj)
                 (cons obj  (delay (lazy-filter pred (force (cdr ls)))))
                 (lazy-filter pred (force (cdr ls)))))))

(define (take n lst)
  (if (or (zero? n) (null? lst))
      '()
      (let ((head (car lst)))
           (cons head (take (- n 1) (force (cdr lst)))))))

(define (oddsFrom n)
    (if (= (remainder n 2) 1)
        (cons n (delay (oddsFrom (+ n 2))))
        (cons (+ n 1) (delay (oddsFrom (+ n 3))))))

(define (primeSieve values)
    (let ((head (car values)))
         (cons head
               (delay (primeSieve (lazy-filter
                   (lambda (prime) (not (= 0 (remainder prime head))))
                   (force (cdr values))))))))

(define (primes)
    (primeSieve (cons 2 (delay (oddsFrom 3)))))

(define (printLine index primes)
    (display (format #f
        "     ~4,'0d ~4,'0d ~4,'0d ~4,'0d ~4,'0d ~4,'0d ~4,'0d ~4,'0d ~4,'0d ~4,'0d\n"
        (list-ref primes index) (list-ref primes (+ index 50))
        (list-ref primes (+ index 100)) (list-ref primes (+ index 150))
        (list-ref primes (+ index 200)) (list-ref primes (+ index 250))
        (list-ref primes (+ index 300)) (list-ref primes (+ index 350))
        (list-ref primes (+ index 400)) (list-ref primes (+ index 450)))))

(define (printLines index primes)
    (if (>= index 50)
        '()
        (begin
            (printLine index primes)
            (printLines (+ index 1) primes))))

(define (printPrimes primes)
    (printLines 0 primes))

(display "First Five Hundred Primes\n")
(printPrimes (take 500 (primes)))
