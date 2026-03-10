
(defn oddsFrom [n]
  (if (= (rem n 2) 1)
    (cons n (lazy-seq (oddsFrom (+ n 2))))
    (cons (+ n 2) (lazy-seq (oddsFrom (+ n 3))))))

(defn primeSieve [values]
  (lazy-seq
   (cons (first values)
         (primeSieve (filter #(not= 0 (mod % (first values))) (rest values))))))

(def primes (primeSieve (cons 2 (oddsFrom 3))))

(defn printLine [index primes]
  (printf "     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d\n"
          (nth primes index) (nth primes (+ index 50))
          (nth primes (+ index 100)) (nth primes (+ index 150))
          (nth primes (+ index 200)) (nth primes (+ index 250))
          (nth primes (+ index 300)) (nth primes (+ index 350))
          (nth primes (+ index 400)) (nth primes (+ index 450))))

(defn printLines [index primes]
  (if (>= index 50)
    nil
    (do
      (printLine index primes)
      (printLines (+ 1 index) primes))))

(defn printPrimes [primes]
  (printLines 0 primes))

(println "First Five Hundred Primes") (printPrimes (take 500 primes))
