FROM ghcr.io/hassio-addons/ubuntu-base/aarch64:2fecaa0

RUN apt-get update
RUN apt-get --assume-yes install gnupg jq git

RUN curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg -o /etc/apt/keyrings/nodesource.gpg --dearmor
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_21.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

RUN apt-get update
RUN apt-get install -y mongodb-org nodejs

WORKDIR /app

RUN git clone https://github.com/KagasiraBunJee/espcam-photo-server.git server

COPY . /
COPY ./mongo-scripts/init-mongo.js ./
COPY ./mongo-scripts/mongo.conf ./

RUN chmod a+x /run.sh
RUN chmod a+x /prepare-server.sh

CMD ["/run.sh"]
