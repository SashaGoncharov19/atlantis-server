console.clear();

const config = require('./config.json');
const color = require('colors');

let info = color.blue(`[INFO] `);
let success = color.green(`[INFO] `);
let warn = color.yellow(`[WARN] `);
let error = color.red(`[ERROR] `);

//MySQL section

let connected = false;

const mysql = require('mysql');
const DB = mysql.createPool({
    host: config.DB.host,
    user: config.DB.user,
    password: config.DB.password,
    database: config.DB.database
});

const spareDB = mysql.createPool({
    host: config.DB.host,
    user: config.DB.user,
    password: config.DB.password
})

DB.getConnection((err, connection) => {
    if (err) {
        if (err.sqlMessage === `Unknown database '${config.DB.database}'`) {
            console.log(warn + 'DB not found. Creating database..')
            createDB();
        } else {
            if (err) return console.log(color.red(`[DB] Connect error. ${err}`));
            return ;
        }
    }
    console.log(color.green(`[DB] Connected successful.`))
    connected = true;
})

//MySQL section end

//Express section

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.get('/api/newsList', (req, res) => {
    DB.query(`SELECT * FROM posts`, function (error, result) {
        res.send(result);
    })
})

app.get('/api/serversList', (req, res) => {
    DB.query(`SELECT * FROM server_data`, function (error, result) {
        res.send(result);
    })
})

app.get('/api/fullOnline', (req, res) => {
    DB.query(`SELECT * FROM server_data`, function (error, result) {
        let online = 0;
        for (var i = 0; i < result.length; i++) {
            online = online + Number(result[i].online);
        }
        res.send(`${online}`)
    })
})


app.listen(config.port,function (req, res) {
    console.log(`API started on port: ${config.port}`);
});

//Express section end


//System

const axios = require('axios');
const e = require("express");

setTimeout(() => {
    if (connected) {
        system();
        setInterval(system, 30000);
    } else {
        console.log(error + `System stopped. DB not connected`);
    }
}, 5000)

function system () {
    axios.get(('https://api.altv.mp/servers/list')).then((response) => {
        let data = response.data;
        DB.query(`SELECT * FROM server_data`, function (err, res) {
            if (res.length >= 1) {
                for (var i = 0; i < res.length; i++) {
                    let serverData = data.find(server => server.host == `${res[i].ip}` && server.port == res[i].port)
                    if (serverData == undefined) {
                        console.log(`[LOG] Server ${res[i].ip} unavailable`);
                        DB.query(`UPDATE server_data SET online = ? WHERE ip = ?`, [undefined, res[i].ip])
                    } else {
                        DB.query(`UPDATE server_data SET online = ? WHERE ip = ?`, [serverData.players, serverData.ip])
                    }
                }
            } else {
                console.log(`[WARN] Add server on DB.`)
            }
        })
    })
}

function createDB () {
    spareDB.query(`CREATE DATABASE ${config.DB.database}`, (error0, result0) => {
        if (result0) {
            console.log(info + `DB ${config.DB.database} created.`);
            spareDB.query(`USE ${config.DB.database}`, (error1, result1) => {
                if (result1) {
                    console.log(info + `Using ${config.DB.database} DB.`);
                    DB.query(`
                            CREATE TABLE server_data (
                                id int(11) NOT NULL,
                                name varchar(255) CHARACTER SET utf8 NOT NULL,
                                online varchar(255) CHARACTER SET utf8 NOT NULL,
                                ip varchar(255) CHARACTER SET utf8 NOT NULL,
                                port int(255) NOT NULL
                            ) ENGINE=InnoDB;
                            `, (error2, result2) => {
                        if (result2) {
                            DB.query(`
                                    ALTER TABLE server_data
                                    ADD PRIMARY KEY (id);
                                `);
                            DB.query(`
                                    ALTER TABLE server_data
                                    MODIFY id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
                                    COMMIT;
                                `);
                            console.log(info + `Column server_data created.`)
                            DB.query(`
                                    CREATE TABLE posts (
                                        id int(11) NOT NULL,
                                        img varchar(255) CHARACTER SET utf8 NOT NULL,
                                        name varchar(255) CHARACTER SET utf8 NOT NULL
                                      ) ENGINE=InnoDB;
                                `, (error3, result3) => {
                                if (result3) {
                                    DB.query(`
                                        ALTER TABLE posts
                                        ADD PRIMARY KEY (id);
                                    `);
                                    DB.query(`
                                        ALTER TABLE posts
                                        MODIFY id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
                                    `);
                                    console.log(info + 'Column posts created.')
                                    console.log(success + 'DB created successful!');
                                } else {
                                    console.log(error3);
                                }
                            })
                        } else {
                            console.log(error2)
                        }
                    })
                } else {
                    console.log(error1);
                }
            })
        } else {
            console.log(error0);
        }
    })
}