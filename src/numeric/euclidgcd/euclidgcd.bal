import ballerina/io;

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

public function main(int m = 15, int n = 10) {
    io:println(`${m} ${n}`);
    io:println(`gcd: ${gcd(m, n)}`);
}
