var user = process.argv[8];
var pwd = process.argv[9];
var mydb = process.argv[10];

let adminDB = db.getSiblingDB("admin");
let usersList = adminDB.getUsers();
if (usersList.users.length === 0) {
    printjson(adminDB.createUser({
        user: user,
        pwd: pwd,
        roles: [
            {
                role: 'readWrite',
                db: mydb,
            },
        ],
    }));
}