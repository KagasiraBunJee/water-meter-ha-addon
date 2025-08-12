FROM ghcr.io/hassio-addons/ubuntu-base/aarch64:10.0.2

WORKDIR /app

RUN apt-get update
RUN apt-get --assume-yes install gnupg jq git wget libssl-dev nginx
RUN mkdir -p /run/nginx

RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg -o /etc/apt/keyrings/nodesource.gpg --dearmor
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_21.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

RUN ARCH=$(uname -m) \
    && if [ "$ARCH" = "aarch64" ]; then \
         echo "Running on ARM64 architecture"; \
         # Install MongoDB for Raspberry Pi (ARM64)
         wget https://github.com/themattman/mongodb-raspberrypi-binaries/releases/download/r7.0.2-rpi-unofficial/mongodb.ce.pi.r7.0.2.tar.gz \
             && tar xzvf mongodb.ce.pi.r7.0.2.tar.gz \
             && wget http://archive.debian.org/debian/pool/main/o/openssl/libssl1.1_1.1.1n-0+deb10u3_arm64.deb \
             && dpkg -i libssl1.1*.deb \
             && apt-get update \
             && apt-get install -y nodejs; \
       else \
         echo "Not running on ARM64 architecture"; \
         # Install MongoDB for other architectures
         curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
             gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
             && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
             && apt-get update \
             && apt-get install -y mongodb-org nodejs; \
       fi

RUN git clone --branch feat/dashboard-single-page --single-branch https://github.com/KagasiraBunJee/espcam-photo-server.git server

COPY . /
COPY ./mongo-scripts/mongo.conf ./
COPY ingress.conf /etc/nginx/sites-enabled/

RUN chmod a+x /run.sh
RUN chmod a+x /prepare-server.sh

CMD ["/run.sh"]
