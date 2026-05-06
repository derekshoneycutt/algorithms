# Docker file for setting up a general development container for Derek's Algorithms project

# We start with an Ubuntu Linux build and prerequisites; enter bash when we have it
FROM ubuntu:noble AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update -y
RUN apt install -y \
        software-properties-common apt-transport-https
RUN add-apt-repository -y ppa:ubuntu-toolchain-r/test
RUN dpkg --add-architecture i386
RUN apt update -y
RUN apt install -y \
        build-essential libtool libtool-bin cmake \
        libstdc++-13-dev rsync ca-certificates \
        gcc-multilib g++-multilib
RUN apt install -y \
        git wget curl unzip xz-utils zip gawk \
        flex bison ninja-build \
        gnupg2 libcurl4-openssl-dev pkg-config
RUN apt install -y \
        libx11-dev libxext-dev libncurses-dev libtinfo-dev \
        libx11-dev:i386 libxext-dev:i386 libncurses-dev:i386 libtinfo-dev:i386

# Setup a temp build directory 
RUN mkdir -p /build
WORKDIR /build

# ============================================
#               Setup Some Basics, including Python, Clang
#
#       This section precedes builds requiring GCC13...
#       We will install GCC16 and other, more advanced options,
#       after these builds
# ============================================
RUN apt install -y \
        gnat nasm python3 python3-pip clang

RUN ln -s /usr/bin/python3 /usr/bin/python

# ============================================
#               Critical Mass Modula-3 Compiler
#       Release and source available at:
#        https://github.com/modula3/cm3/
# ============================================
ENV CM3_VERSION=d5.11.10
ENV CM3_DISTVERSION=AMD64_LINUX-None
ENV CM3_MIRROR=https://github.com/modula3/cm3/releases/download
ENV CM3_ROOT=/build/cm3-dist-${CM3_DISTVERSION}
RUN wget "${CM3_MIRROR}/${CM3_VERSION}/cm3-dist-${CM3_DISTVERSION}.tar.xz" && \
    tar -xf cm3-dist-${CM3_DISTVERSION}.tar.xz && \
    mkdir -p /build/cm3-build && \
    mkdir -p /build/cm3-output
WORKDIR /build/cm3-build
RUN ${CM3_ROOT}/scripts/concierge.py install --prefix /build/cm3-output && \
    rsync -av --ignore-existing --prune-empty-dirs /build/cm3-output/ /usr/local/

WORKDIR /build
RUN rm -rf *

# ============================================
#               Oberon
#       Release and source available at:
#        https://github.com/vishaps/voc
# ============================================
ENV OBERON_REPO=https://github.com/vishaps/voc
RUN git clone ${OBERON_REPO} --depth 1
WORKDIR /build/voc
RUN make full && \
    make install && \
    test -d /opt/voc/bin

ENV PATH=/opt/voc/bin:${PATH}

WORKDIR /build
RUN rm -rf *

# ============================================
#               Simula
#       Release and source available at:
#        https://www.gnu.org/software/cim/
# ============================================
ENV CIM_VERSION=5.1
ENV CIM_MIRROR=https://ftpmirror.gnu.org/gnu/cim
RUN wget "${CIM_MIRROR}/cim-${CIM_VERSION}.tar.gz" && \
    tar -zxf "cim-${CIM_VERSION}.tar.gz" && \
    sed -i 's|../../lib/cim\.h|cim.h|g' \
        "/build/cim-${CIM_VERSION}/lib/simset.c" \
        "/build/cim-${CIM_VERSION}/lib/simulation.c" && \
    mkdir -p "/build/cim-${CIM_VERSION}-build"
WORKDIR /build/cim-${CIM_VERSION}-build
RUN "/build/cim-${CIM_VERSION}/configure" && \
    make && \
    make install && \
    touch /etc/ld.so.conf.d/libc5.conf && \
    echo "/usr/local/lib" | tee /etc/ld.so.conf.d/libc5.conf && \
    ldconfig

WORKDIR /build
RUN rm -rf *

# ============================================
#               Smalltalk
#       Release and source available at:
#        https://www.gnu.org/software/smalltalk/
# ============================================
ENV GST_VERSION=3.2.5
ENV GST_MIRROR=https://ftp.gnu.org/gnu/smalltalk
RUN wget "${GST_MIRROR}/smalltalk-${GST_VERSION}.tar.gz" && \
    tar -zxf "smalltalk-${GST_VERSION}.tar.gz" && \
    mkdir -p "/build/smalltalk-${GST_VERSION}-build"
WORKDIR /build/smalltalk-${GST_VERSION}-build
RUN "/build/smalltalk-${GST_VERSION}/configure" && \
    make && \
    make install

WORKDIR /build
RUN rm -rf *

# ============================================
#               Self
# ============================================
ENV SELF_GIT=https://github.com/russellallen/self/
RUN git clone ${SELF_GIT} && \
    cd self && \
    cmake . -DCMAKE_C_STANDARD=90 -DCMAKE_C_STANDARD_REQUIRED=ON && \
    cmake --build . && \
    echo "'world.snap' _WriteSnapshot." >> saveWorld.self && \
    echo "_Quit" | ./vm/Self -f objects/worldBuilder.self -b objects -o "" -f2 saveWorld.self && \
    echo 'SCRIPT_DIR=$(dirname "$(readlink -f "$0")")' > ./run-self.sh && \
    echo '"${SCRIPT_DIR}/vm/Self" -s "${SCRIPT_DIR}/world.snap" -f "$1" 2>/dev/null' >> ./run-self.sh && \
    chmod a+x ./run-self.sh && \
    cd .. && mv self /opt/self

ENV PATH=/opt/self:/opt/self/vm:${PATH}

WORKDIR /build
RUN rm -rf *

# ============================================
#               Zig
#       Release and source available at:
#        https://ziglang.org/download/
# ============================================
ENV ZIG_VERSION=x86_64-linux-0.17.0-dev.251+0db721ec2
ENV ZIG_MIRROR=https://ziglang.org/builds
ENV ZIG_ROOT=/usr/local/zig
RUN wget ${ZIG_MIRROR}/zig-${ZIG_VERSION}.tar.xz && \
    tar -xf zig-${ZIG_VERSION}.tar.xz && \
    mkdir -p ${ZIG_ROOT} && \
    rsync -av --delete "/build/zig-${ZIG_VERSION}/" ${ZIG_ROOT}/ && \
    ln -sf ${ZIG_ROOT}/zig /usr/local/bin/zig && \
    zig version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Rust (system-wide)
#       Release and source available at:
#        https://www.rust-lang.org/
# ============================================
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV PATH=${CARGO_HOME}/bin:${PATH}
ENV RUSTUP_INIT_VERSION=1.29.0
RUN wget -O /tmp/rustup-init "https://static.rust-lang.org/rustup/archive/${RUSTUP_INIT_VERSION}/x86_64-unknown-linux-gnu/rustup-init" && \
    chmod +x /tmp/rustup-init && \
    /tmp/rustup-init -y --no-modify-path --profile minimal --default-toolchain stable && \
    rm -f /tmp/rustup-init && \
    rustup --version && \
    rustc --version && \
    cargo --version

WORKDIR /build
RUN rm -rf *

# ============================================
#               WABT, WASI-SDK, WASMTIME
#       Release and source available at:
#        https://github.com/WebAssembly/wabt
# ============================================
ENV WABT_VERSION=1.0.40
ENV WABT_GIT=https://github.com/WebAssembly/wabt.git
ENV WASI_OS=linux
ENV WASI_ARCH=x86_64
ENV WASI_VERSION=27
ENV WASI_VERSION_FULL=${WASI_VERSION}.0
ENV WASI_MIRROR=https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_VERSION}
ENV WASI_VERSIONED=wasi-sdk-${WASI_VERSION_FULL}-${WASI_ARCH}-${WASI_OS}
ENV WASI_PACKAGE=${WASI_VERSIONED}.tar.gz
ENV WASMTIME_SCRIPT=https://wasmtime.dev/install.sh
RUN git clone ${WABT_GIT} --depth 1 --branch ${WABT_VERSION} && \
    cd /build/wabt && \
    git submodule update --init &&\
    make && \
    make install && \
    wasm2wat --version
RUN wget ${WASI_MIRROR}/${WASI_PACKAGE} && \
    tar xvf ${WASI_PACKAGE} && \
    mv ${WASI_VERSIONED} ~/wasi-sdk && \
    rm -rf *
RUN curl ${WASMTIME_SCRIPT} -sSf | bash

ENV WASMTIME_HOME="${HOME}/.wasmtime"
ENV PATH="${WASMTIME_HOME}/bin:${PATH}"

WORKDIR /build
RUN rm -rf *

# ============================================
#               G++ 16 - Included for extra C++ features
# ============================================

RUN add-apt-repository -y ppa:ubuntu-toolchain-r/test && \
    apt update
RUN apt install -y \
        gcc-16 g++-16 gcc-16-multilib g++-16-multilib && \
    update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-13 300 && \
    update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-16 500 && \
    update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-13 300 && \
    update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-16 500 && \
    update-alternatives --set gcc /usr/bin/gcc-16 && \
    update-alternatives --set g++ /usr/bin/g++-16

# ============================================
#               Setup Some additional Basics, including Java, Erlang, LLVM
#
#       This section is about setting up some more advanced
#       languages that may rely on cores like Java, Erlang, LLVM, etc.
# ============================================
RUN add-apt-repository -y universe && \
    apt update -y
RUN apt install -y \
        gobjc-13 libobjc-13-dev \
        gobjc-16 libobjc-16-dev \
        gnustep gnustep-devel \
        default-jdk lua5.4 \
        gnucobol gforth gfortran ghc fpc tcl \
        erlang elixir \
        sbcl guile-3.0 chezscheme \
        nodejs npm perl ruby php \
        kotlin \
        dotnet-sdk-8.0 dotnet-sdk-10.0 \
        nim ocaml octave gprolog

WORKDIR /build
RUN rm -rf *

# ============================================
#               Io
# ============================================
ENV IO_GIT=https://github.com/IoLanguage/io.git
RUN git config --global url."https://github.com/".insteadOf git@github.com: && \
    git clone ${IO_GIT} && \
    cd io && git submodule update --init --recursive && make && \
    mkdir -p /opt/io && \
    mv ./build/* /opt/io/

# ============================================
#               Idris2
#       Release and source available at:
#        https://www.idris-lang.org/pages/download.html
# ============================================
ENV XDG_CONFIG_HOME=/usr/local/etc
ENV XDG_STATE_HOME=/usr/local/var
ENV XDG_CACHE_HOME=/var/cache
ENV PACK_BIN_DIR=/usr/local/bin
RUN wget -O idris2-pack-install.bash https://raw.githubusercontent.com/stefan-hoeck/idris2-pack/main/install.bash && \
    chmod +x idris2-pack-install.bash && \
    yes '' | bash idris2-pack-install.bash && \
    rm -f idris2-pack-install.bash && \
    idris2 --version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Icon
#       Release and source available at:
#        https://github.com/gtownsend/icon
# ============================================
ENV ICON_REPO=https://github.com/gtownsend/icon
RUN git clone ${ICON_REPO}.git --depth 1
WORKDIR /build/icon
RUN make Configure name=linux && \
    make && \
    cp /build/icon/bin/* /usr/local/bin/ && \
    icont -V

WORKDIR /build
RUN rm -rf *

# ============================================
#               Ballerina
#       Release and source available at:
#        https://ballerina.io/downloads/
# ============================================
ENV BALLERINA_VERSION=2201.13.3
ENV BALLERINA_VERSION_NAME=swan-lake
ENV BALLERINA_MIRROR=https://dist.ballerina.io/downloads
RUN wget "${BALLERINA_MIRROR}/${BALLERINA_VERSION}/ballerina-${BALLERINA_VERSION}-${BALLERINA_VERSION_NAME}-linux-x64.deb" && \
    apt install -y "/build/ballerina-${BALLERINA_VERSION}-${BALLERINA_VERSION_NAME}-linux-x64.deb" && \
    bal version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Clojure
#       Release and source available at:
#        https://leiningen.org/
# ============================================
ENV LEININGEN_MIRROR=https://raw.githubusercontent.com/technomancy/leiningen/stable/bin
ENV LEIN_HOME=/usr/local/lib/lein
RUN wget "${LEININGEN_MIRROR}/lein" && \
    chmod a+x /build/lein && \
    mv /build/lein /usr/local/bin/ && \
    mkdir -p /etc/leiningen ${LEIN_HOME} && \
    echo "{:user {:plugins [[lein-exec \"0.3.7\"]]}}" > /etc/leiningen/profiles.clj && \
    lein -v

WORKDIR /build
RUN rm -rf *

# ============================================
#               Factor
#       Release and source available at:
#        https://factorcode.org/
# ============================================
ENV FACTOR_VERSION=0.101
ENV FACTOR_MIRROR=https://downloads.factorcode.org/releases
ENV FACTOR_ROOT=/usr/local/factor
RUN wget "${FACTOR_MIRROR}/${FACTOR_VERSION}/factor-linux-x86-64-${FACTOR_VERSION}.tar.gz" && \
    tar -zxf "factor-linux-x86-64-${FACTOR_VERSION}.tar.gz" && \
    mkdir -p ${FACTOR_ROOT} && \
    rsync -av --delete "/build/factor/" ${FACTOR_ROOT}/ && \
    ln -sf ${FACTOR_ROOT}/factor /usr/local/bin/factor && \
    test -x ${FACTOR_ROOT}/factor

WORKDIR /build
RUN rm -rf *

# ============================================
#               FreeBASIC
#       Release and source available at:
#        https://www.freebasic.net/
# ============================================
ENV FREEBASIC_VERSION=1.10.1
ENV FREEBASIC_MIRROR=https://downloads.sourceforge.net/fbc

RUN wget -O "/build/FreeBASIC-${FREEBASIC_VERSION}-ubuntu-22.04-x86_64.tar.gz" \
    "${FREEBASIC_MIRROR}/FreeBASIC-${FREEBASIC_VERSION}-ubuntu-22.04-x86_64.tar.gz?download" && \
    tar -zxf "/build/FreeBASIC-${FREEBASIC_VERSION}-ubuntu-22.04-x86_64.tar.gz"
WORKDIR "/build/FreeBASIC-${FREEBASIC_VERSION}-ubuntu-22.04-x86_64"
RUN "/build/FreeBASIC-${FREEBASIC_VERSION}-ubuntu-22.04-x86_64/install.sh" -i && \
    fbc --version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Haxe
#       Release and source available at:
#        https://haxe.org/download/
# ============================================
ENV HAXE_VERSION=4.3.7
ENV HAXE_ROOT=/usr/local/haxe
ENV HAXE_STD_PATH=${HAXE_ROOT}/std
ENV HAXELIB_PATH=/usr/local/lib/haxelib
ENV HAXE_SHA256=a156b3d039daa572f1f9329870ee753e3c39b7514fe8c818069323579659acca
RUN wget "https://github.com/HaxeFoundation/haxe/releases/download/${HAXE_VERSION}/haxe-${HAXE_VERSION}-linux64.tar.gz" && \
    echo "${HAXE_SHA256}  haxe-${HAXE_VERSION}-linux64.tar.gz" | sha256sum -c - && \
    apt install -y neko && \
    mkdir -p ${HAXE_ROOT} && \
    tar -zxf "haxe-${HAXE_VERSION}-linux64.tar.gz" --strip-components=1 -C ${HAXE_ROOT} && \
    ln -sf ${HAXE_ROOT}/haxe /usr/local/bin/haxe && \
    ln -sf ${HAXE_ROOT}/haxelib /usr/local/bin/haxelib && \
    mkdir -p ${HAXELIB_PATH} && \
    haxelib setup ${HAXELIB_PATH} && \
    haxe --version && \
    haxelib version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Julia
#       Release and source available at:
#        https://julialang.org/
# ============================================
ENV JULIA_VERSION=1.12.6
ENV JULIA_SERIES=1.12
ENV JULIA_ROOT=/usr/local/julia
RUN wget "https://julialang-s3.julialang.org/bin/linux/x64/${JULIA_SERIES}/julia-${JULIA_VERSION}-linux-x86_64.tar.gz" && \
    mkdir -p ${JULIA_ROOT} && \
    tar -zxf "julia-${JULIA_VERSION}-linux-x86_64.tar.gz" --strip-components=1 -C ${JULIA_ROOT} && \
    ln -sf ${JULIA_ROOT}/bin/julia /usr/local/bin/julia && \
    julia --version

WORKDIR /build 
RUN rm -rf *

# ============================================
#               Mercury
#       Release and source available at:
#        https://www.mercurylang.org/
# ============================================
RUN wget https://paul.bone.id.au/paul.asc && \
    cp paul.asc /etc/apt/trusted.gpg.d/paulbone.asc && \
    echo "deb https://dl.mercurylang.org/deb/ noble main" >> /etc/apt/sources.list.d/mercury.list && \
    echo "deb-src https://dl.mercurylang.org/deb/ noble main" >> /etc/apt/sources.list.d/mercury.list && \
    apt update && \
    apt install -y mercury-recommended

WORKDIR /build
RUN rm -rf *

# ============================================
#               D
#       Release and source available at:
#        https://dlang.org/
# ============================================
ENV DLANG_VERSION=2.112.0
ENV DLANG_DISTVERSION=${DLANG_VERSION}-0_amd64
ENV DLANG_MIRROR=https://downloads.dlang.org/releases/2.x
RUN wget "${DLANG_MIRROR}/${DLANG_VERSION}/dmd_${DLANG_DISTVERSION}.deb" && \
    apt install -y "/build/dmd_${DLANG_DISTVERSION}.deb"

WORKDIR /build
RUN rm -rf *

# ============================================
#               Go
#       Release and source available at:
#        https://go.dev/dl/
# ============================================
ENV GOLANG_VERSION=1.26.2
ENV GOLANG_DISTVERSION=${GOLANG_VERSION}.linux-amd64
ENV GOLANG_MIRROR=https://go.dev/dl
ENV GOROOT=/usr/local/go
ENV PATH=${GOROOT}/bin:${PATH}
RUN wget "${GOLANG_MIRROR}/go${GOLANG_DISTVERSION}.tar.gz" && \
    tar zxf "go${GOLANG_DISTVERSION}.tar.gz" && \
    rsync -av --delete "/build/go/" ${GOROOT}/ && \
    go version

WORKDIR /build
RUN rm -rf *

# ============================================
#               MMIXAL
#       Release and source available at:
#        https://www.mmix.cs.hm.edu/
# ============================================
ENV MMIXAL_MIRROR=https://mmix.cs.hm.edu/bin
RUN wget "${MMIXAL_MIRROR}/mmix" -O /usr/local/bin/mmix && \
    wget "${MMIXAL_MIRROR}/mmixal" -O /usr/local/bin/mmixal && \
    wget "${MMIXAL_MIRROR}/mmmix" -O /usr/local/bin/mmmix && \
    wget "${MMIXAL_MIRROR}/mmotype" -O /usr/local/bin/mmotype && \
    chmod a+x /usr/local/bin/mmix /usr/local/bin/mmixal /usr/local/bin/mmmix /usr/local/bin/mmotype

WORKDIR /build
RUN rm -rf *

# ============================================
#               Mojo
#       Release and source available at:
#        https://www.modular.com/open-source/mojo
# ============================================
ENV PIXI_HOME=/usr/local/pixi
ENV PATH=${PIXI_HOME}/bin:${PATH}
RUN curl -fsSL https://pixi.sh/install.sh | PIXI_HOME=${PIXI_HOME} sh && \
    pixi init hello-world \
        -c https://conda.modular.com/max-nightly/ -c conda-forge && \
    cd hello-world && pixi add mojo

WORKDIR /build
RUN rm -rf *

# ============================================
#               R
#       Release and source available at:
#        https://www.r-project.org/
# ============================================
RUN echo "deb https://cloud.r-project.org/bin/linux/ubuntu noble-cran40/" >> /etc/apt/sources.list.d/cran.list && \
    wget -qO- https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc | tee /etc/apt/trusted.gpg.d/cran_ubuntu_key.asc && \
    apt update && \
    apt install -y r-base && \
    R --version | head -n 1

WORKDIR /build
RUN rm -rf *

# ============================================
#               Scala
#       Release and source available at:
#        https://www.scala-lang.org/download/
# ============================================
ENV COURSIER_VERSION=2.1.25-M24
RUN curl -fL https://github.com/coursier/coursier/releases/download/v${COURSIER_VERSION}/cs-x86_64-pc-linux.gz | gzip -d > /usr/local/bin/cs && \
    chmod +x /usr/local/bin/cs && \
    cs install --dir /usr/local/bin scala scalac && \
    scala -version && scalac -version && \
    echo "Forcing initiation with initial build" && \
    echo "@main" > /build/hello.scala && \
    echo "def hello(): Unit =" >> /build/hello.scala && \
    echo "  println(\"Hello, world!\")" >> /build/hello.scala && \
    scala compile /build/hello.scala

WORKDIR /build
RUN rm -rf *

# ============================================
#               Swift
#       Release and source available at:
#        https://www.swift.org/
# ============================================
ENV SWIFTLY_VERSION=1.1.1
ENV SWIFT_VERSION=6.3
ENV SWIFTLY_HOME_DIR=/usr/local/swiftly
ENV SWIFTLY_BIN_DIR=/usr/local/bin
RUN curl -O https://download.swift.org/swiftly/linux/swiftly-${SWIFTLY_VERSION}-x86_64.tar.gz && \
    tar zxf swiftly-${SWIFTLY_VERSION}-x86_64.tar.gz && \
    ./swiftly init --quiet-shell-followup && \
    swiftly install --use ${SWIFT_VERSION} && \
    swiftly --version

WORKDIR /build
RUN rm -rf *

# ============================================
#               V
#       Release and source available at:
#        https://vlang.io/
# ============================================
ENV V_VERSION=0.5.1
ENV V_ROOT=/usr/local/v
RUN wget https://github.com/vlang/v/releases/download/${V_VERSION}/v_linux.zip && \
    unzip v_linux.zip && \
    mkdir -p ${V_ROOT} && \
    rsync -av --delete "/build/v/" ${V_ROOT}/ && \
    ln -sf ${V_ROOT}/v /usr/local/bin/v && \
    chmod a+x /usr/local/bin/v && \
    v version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Typescript
#       Release and source available at:
#        https://www.typescriptlang.org/
# ============================================
ENV TYPESCRIPT_VERSION=6.0.3
RUN npm install -g typescript@${TYPESCRIPT_VERSION} && \
    npm i -g --save-dev @types/node && \
    tsc --version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Kit
#       Release and source available at:
#        https://gitlab.com/kit-lang
# ============================================
ENV KIT_VERSION=2026.5.3
ENV KIT_ROOT=/usr/local/kit
ENV PATH=${KIT_ROOT}/bin:${PATH}
ENV KIT_STD_PATH=${KIT_ROOT}/std
RUN wget "https://gitlab.com/api/v4/projects/kit-lang%2Fkit-lang/packages/generic/kit/v${KIT_VERSION}/kit-v${KIT_VERSION}-linux-x86_64.tar.gz" && \
    mkdir -p ${KIT_ROOT} && \
    tar -zxf "kit-v${KIT_VERSION}-linux-x86_64.tar.gz" --strip-components=1 -C ${KIT_ROOT} && \
    test -x ${KIT_ROOT}/bin/kit && \
    ${KIT_ROOT}/bin/kit --help >/dev/null

WORKDIR /build
RUN rm -rf *

# ============================================
#               Gleam
#       Release and source available at:
#        https://gleam.run/
# ============================================
ENV GLEAM_VERSION=1.16.0
ENV GLEAM_MIRROR=https://github.com/gleam-lang
RUN git clone ${GLEAM_MIRROR}/gleam.git --depth 1 --branch v${GLEAM_VERSION}
WORKDIR /build/gleam
RUN cargo install --path gleam-bin --force --locked && \
    gleam --version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Dart
#       Release and source available at:
#        https://dart.dev/get-dart
# ============================================
RUN wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub \
        | gpg  --dearmor -o /usr/share/keyrings/dart.gpg && \
    echo 'deb [signed-by=/usr/share/keyrings/dart.gpg arch=amd64] https://storage.googleapis.com/download.dartlang.org/linux/debian stable main' \
        | tee /etc/apt/sources.list.d/dart_stable.list && \
    apt-get update && apt-get install -y dart && \
    dart --version

WORKDIR /build
RUN rm -rf *

# ============================================
#               Liberty Eiffel -- not shipping a commercial package in this docker, so here is libertyeiffel
#       Release and source available at:
#        http://www.eiffel.com/products/liberty-eiffel
# ============================================
ENV LIBERTY_EIFFEL_VERSION=2016.05~release
ENV LIBERTY_EIFFEL_MIRROR=https://apt.liberty-eiffel.org/pool/main/libe/liberty-eiffel
RUN apt install -y castxml libgc-dev && \
    wget "${LIBERTY_EIFFEL_MIRROR}/liberty-eiffel-core-libs_${LIBERTY_EIFFEL_VERSION}_all.deb" && \
    wget "${LIBERTY_EIFFEL_MIRROR}/liberty-eiffel-extra-libs_${LIBERTY_EIFFEL_VERSION}_all.deb" && \
    wget "${LIBERTY_EIFFEL_MIRROR}/liberty-eiffel-tools_${LIBERTY_EIFFEL_VERSION}_amd64.deb" && \
    dpkg-deb -x "liberty-eiffel-core-libs_${LIBERTY_EIFFEL_VERSION}_all.deb" / && \
    dpkg-deb -x "liberty-eiffel-extra-libs_${LIBERTY_EIFFEL_VERSION}_all.deb" / && \
    dpkg-deb -x "liberty-eiffel-tools_${LIBERTY_EIFFEL_VERSION}_amd64.deb" / && \
    test -x /usr/bin/se && \
    /usr/bin/se -help >/dev/null

WORKDIR /build
RUN rm -rf *

# ============================================
#               Racket (standalone, newer than apt)
# ============================================
ENV RACKET_VERSION=9.1
ENV RACKET_INSTALLER=racket-${RACKET_VERSION}-x86_64-linux-buster-cs.sh
ENV RACKET_MIRROR=https://download.racket-lang.org/installers/${RACKET_VERSION}
RUN cd /build && \
    wget -q "${RACKET_MIRROR}/${RACKET_INSTALLER}" && \
    chmod a+x ./${RACKET_INSTALLER} && \
    ./${RACKET_INSTALLER} --create-links --unix-style --dest /opt/racket && \
    rm -rf *

ENV PATH=/opt/racket/bin:${PATH}

# ============================================
#               Rhombus
# ============================================
RUN raco pkg install --auto rhombus

# ============================================
#               Rakudo
# ============================================
ENV RAKUDO_MIRROR=https://dl.cloudsmith.io/public/nxadm-pkgs/rakudo-pkg/setup.deb.sh
RUN curl -1sLf "${RAKUDO_MIRROR}" | bash && \
    apt install -y rakudo

# ============================================
#               ODIN
# ============================================
ENV ODIN_GIT=https://github.com/odin-lang/Odin.git
RUN git clone ${ODIN_GIT} --depth 1 && \
    cd Odin && \
    make release-native && \
    mkdir -p /opt/odin && \
    mv * /opt/odin/ && \
    cd .. && \
    rm -rf *

ENV PATH=/opt/odin:${PATH}

# ============================================
#               PL/I - Iron Springs Software compiler
# ============================================
ENV PLI_VERSION=1.4.1
ENV PLI_MIRROR=http://www.iron-spring.com/pli-${PLI_VERSION}
RUN wget ${PLI_MIRROR}.tgz && \
    tar zxvf pli-${PLI_VERSION}.tgz && \
    cd pli-${PLI_VERSION} && \
    make install && \
    cd .. && \
    rm -rf *

# ============================================
#               Q'Nial
# ============================================
ENV QNIAL_MIRROR=https://github.com/niallang/Nial_Development/releases/download/Originals
ENV QNIAL_ZIP=Linux64.zip
ENV QNIAL_FULLADDR=${QNIAL_MIRROR}/${QNIAL_ZIP}
ENV QNIAL_EXE=Linux/nial64
RUN wget ${QNIAL_FULLADDR} -O ./${QNIAL_ZIP} && \
    unzip ./${QNIAL_ZIP} && \
    chmod a+x ./${QNIAL_EXE} && \
    mv ./${QNIAL_EXE} /usr/bin/ &&\
    rm -rf *

# ============================================
#               J
# ============================================
ENV J_VERSION=9.7
ENV J_SCRIPT=jinstall.sh
ENV J_MIRROR=jsoftware.com/download
ENV J_FULLADDRESS=${J_MIRROR}/j${J_VERSION}/${J_SCRIPT}
RUN curl -fsSL ${J_FULLADDRESS} -o ${J_SCRIPT} && \
    chmod a+x ${J_SCRIPT} && \
    echo "y" | ./${J_SCRIPT} -p /opt/ --qt full

ENV PATH=/opt/j${J_VERSION}/bin:${PATH}

# ============================================
#               Joy
# ============================================
ENV JOY_GIT=https://github.com/Wodan58/Joy.git
RUN git clone ${JOY_GIT} --depth 1 && \
    cd Joy && mkdir -p build && cd build && \
    cmake -G "Unix Makefiles" .. && \
    cmake --build . && \
    mv joy /usr/bin/

# ============================================
#               Acton
# ============================================
ENV ACTON_VERSION=0.26.0
ENV ACTON_MIRROR=https://github.com/actonlang/acton/releases/download/v${ACTON_VERSION}
ENV ACTON_PACKAGE=acton-linux-x86_64-${ACTON_VERSION}.tar.xz
RUN wget ${ACTON_MIRROR}/${ACTON_PACKAGE} && \
    tar xvf ${ACTON_PACKAGE} && \
    mv ./acton /opt/acton

ENV PATH=/opt/acton/bin:${PATH}

# ============================================
#               C3
# ============================================
ENV C3_MIRROR=https://github.com/c3lang/c3c/releases/latest/download
ENV C3_PACKAGE=c3-linux.tar.gz
RUN wget ${C3_MIRROR}/${C3_PACKAGE} && \
    tar zxvf ${C3_PACKAGE} && \
    mv c3 /opt/c3

ENV PATH=/opt/c3:${PATH}

# ============================================
#               END -- Final cleanup and settings
# ============================================

# dotnet cache: we actually want to setup a cache for dotnet in the build here
# it is often contraindicated in dockers, but it interferes with our purpose to have
# to load up a new cache every single time we call in.
RUN echo "Console.WriteLine(\"init\");" > init.cs && \
    dotnet run init.cs >> /dev/null && \
    rm -rf *

# in addition to cleaning, we set environment variables
# some variables are set in .bash_profile, which is not as overwhelming as using ENV
# as we do many other cases. This is positive. We can easily modify this and save another
# image without worrying about cached images or rebuilding the whole thing.
# for these specific variables, this is what we want.
WORKDIR /
RUN rm -rf /build && rm -rf /var/lib/apt/lists/ && \
    echo "[ -z \"\$DEREKALGOS_TIMEOUT\" ] && export DEREKALGOS_TIMEOUT=\"-k 10s 2m\"" >> /root/.bash_profile && \
    echo "[ -z \"\$DEREKALGOS_EIFFEL\" ] && export DEREKALGOS_EIFFEL=\"libertyeiffel\"" >> /root/.bash_profile && \
    echo "[ -z \"\$DEREKALGOS_GCC13\" ] && export DEREKALGOS_GCC13=\"/usr/bin/\"" >> /root/.bash_profile && \
    echo "[ -z \"\$DEREKALGOS_GCC13NAME\" ] && export DEREKALGOS_GCC13NAME=\"gcc-13\"" >> /root/.bash_profile && \
    echo "[ -z \"\$DEREKALGOS_GXX13NAME\" ] && export DEREKALGOS_GXX13NAME=\"g++-13\"" >> /root/.bash_profile && \
    echo "[ -z \"\$DEREKALGOS_RUNONDOCKER\" ] && export DEREKALGOS_RUNONDOCKER=\"\"" >> /root/.bash_profile && \
    echo "[ -z \"\$DEREKALGOS_RUNONSSH\" ] && export DEREKALGOS_RUNONSSH=\"\"" >> /root/.bash_profile
ENV OBJC_INCLUDE_PATH="/usr/lib/gcc/x86_64-linux-gnu/16/include/:/usr/lib/gcc/x86_64-linux-gnu/13/include/:${OBJC_INCLUDE_PATH:-}"
ENV OBJC_LIBRARY_PATH="/usr/lib/gcc/x86_64-linux-gnu/16:/usr/lib/gcc/x86_64-linux-gnu/13"
ENV LIBRARY_PATH="${OBJC_LIBRARY_PATH}:${LIBRARY_PATH:-}"
