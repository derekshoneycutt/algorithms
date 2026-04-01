// This application will take 2 values and print out the GCD for them
import ballerina/io;

# Calculate the GCD of 2 values via Euclid's method
# 
# + m_in - The first value to calculate GCD for
# + n_in - The second value to calculate GCD for
# + return - The calculated GCD for the two values
function gcd(int m_in, int n_in) returns int {
    int r = 0;
    int m = m_in;
    int n = n_in;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

# The main entry point to the application
# 
# + m - The first value to calculate GCD for; defualts to 15
# + n - The second value to caluclate GCD for; defaults to 10
public function main(int m = 15, int n = 10) {
    io:println(`${m} ${n}`);
    io:println(`gcd: ${gcd(m, n)}`);
}
