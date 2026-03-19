
(defn years [n m]
  (when (<= n m)
    (cons n (lazy-seq (years (+ n 1) m)))))

(defn getEasterFor [y]
  (let [g (+ (mod y 19) 1)
        c (+ (quot y 100) 1)
        x (- (quot (* 3 c) 4) 12)
        z (- (quot (+ (* 8 c) 5) 25) 5)
        d (- (quot (* 5 y) 4) x 10)
        et (mod (- (+ (* 11 g) 20 z) x) 30)
        e (if (or (and (= et 25) (> g 11)) (= et 24))
            (+ et 1) et)
        nfmt (- 44 e)
        nfm (if (< nfmt 21) (+ nfmt 30) nfmt)
        n (- (+ nfm 7) (mod (+ d nfm) 7))]
    [(if (> n 31) (- n 31) n) (if (> n 31) "April" "March") y]))

(defn eastersFor [testyears]
  (lazy-seq
   (when-let [years (seq testyears)]
     (cons (getEasterFor (first years))
           (eastersFor (rest years))))))

(defn output [easters]
  (doseq [easter easters]
    (printf "   %02d %s, %04d\n" (get easter 0) (get easter 1) (get easter 2))))

(println "Easters:")
(output (eastersFor (years 1950 2050)))
