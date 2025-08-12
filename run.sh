#!/usr/bin/with-contenv bashio

bashio::log.info "${message:="Hello World..."}"

mkdir -p /data/mongodb #create persistent folder for mongodb
mkdir -p /data/server #create persistent folder for server
mkdir -p /data/server/uploads #create persistent folder for server uploads
mkdir -p /var/log/mongodb #create logs folder for mongo

SERVER_API_TOKEN=$(bashio::config 'server_api_key')
SERVER_PORT=$(bashio::config 'server_port')
DBLOGIN=$(bashio::config 'mongo_userdb_login')
DBPASS=$(bashio::config 'mongo_userdb_pass')
DBDOMAIN=$(bashio::config 'mongo_db_domain')
DBPORT=$(bashio::config 'mongo_db_port')
DBNAME=$(bashio::config 'mongo_db_name')

bashio::log.info "Start mongod service"
# apply mongo script in free access mode
MONGO_RESULT=$(./mongod --config mongo.conf --dbpath /data/mongodb --port $DBPORT --fork)
bashio::log.info $MONGO_RESULT
MONGO_PID=$(echo "$MONGO_RESULT" | grep -o 'forked process: [0-9]*' | awk '{print $NF}')
./mongo --port 8084 --eval "let adminDB = db.getSiblingDB('admin');
                let usersList = adminDB.getUsers();
                if (usersList.length === 0) {
                  print('User $DBLOGIN does not exist in mongo. Creating new one.');
                  print(adminDB.createUser({
                      user: '$DBLOGIN',
                      pwd: '$DBPASS',
                      roles: [
                          {
                              role: 'readWrite',
                              db: '$DBNAME',
                          },
                      ],
                  }));
                }"
sleep 2
kill -15 "$MONGO_PID" # stop mongo
sleep 2

# run mongo in auth mode
./mongod --config mongo.conf --dbpath /data/mongodb --port 8084 --bind_ip_all --auth --fork

cp -a server/. /data/server/

cat <<EOF >/data/server/.env
API_TOKEN=${SERVER_API_TOKEN}
PORT=${SERVER_PORT}
DBLOGIN=${DBLOGIN}
DBPASS=${DBPASS}
DBNAME=${DBNAME}
DBDOMAIN=${DBDOMAIN}
DBPORT=${DBPORT}
EOF

LOG_DIR="/var/log/nginx"
ACCESS_LOG="$LOG_DIR/access.log"
ERROR_LOG="$LOG_DIR/error.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Check if nginx is running
if pgrep -x "nginx" > /dev/null; then
    echo "nginx is already running"
else
    echo "Starting nginx..."
    # Start nginx with custom log files
    nginx -g "daemon off;" \
        -c /etc/nginx/nginx.conf \
        >"$ACCESS_LOG" 2>"$ERROR_LOG" &

    if [ $? -eq 0 ]; then
        echo "nginx started successfully"
    else
        echo "failed to start nginx — check $ERROR_LOG"
        exit 1
    fi
fi

sh /prepare-server.sh
