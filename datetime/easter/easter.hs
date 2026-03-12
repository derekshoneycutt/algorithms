import Text.Printf
import Data.Time.Calendar
import Data.Time.Format

years :: Integer -> Integer -> [Integer]
years n m = [n..m]

getEasterFor :: Integer -> Day
getEasterFor year =
    let g = year `mod` 19 + 1
        c = year `div` 100 + 1
        x = 3 * c `div` 4 - 12
        z = (8 * c + 5) `div` 25 - 5
        d = 5 * year `div` 4 - x - 10
        et = (11 * g + 20 + z - x) `mod` 30
        e = if et == 25 && g > 11 || et == 24 then et + 1 else et
        nfmt = 44 - e
        nfm = if nfmt < 21 then nfmt + 30 else nfmt
        n = nfm + 7 - (d + nfm) `mod` 7
        month = if n > 31 then 4 else 3
        day = if n > 31 then n - 31 else n
    in fromGregorian year month (fromIntegral day)

eastersFor :: [Integer] -> [Day]
eastersFor [] = []
eastersFor (year : tail) =
    getEasterFor(year) : eastersFor(tail)

output :: [Day] -> IO ()
output [] = return ()
output (easter : tail) = do
    putStrLn $ formatTime defaultTimeLocale "   %d %B, %Y" easter
    output tail

main :: IO ()
main = do
    putStrLn $ "Easters:"
    output (eastersFor (years 1950 2050))
