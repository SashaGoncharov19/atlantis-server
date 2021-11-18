console.clear();
require('dotenv').config()

const config = require('../config.json');
const color = require('colors');

//MySQL section

const mysql = require('mysql');
const DB = mysql.createPool({
    host: config.DB.host,
    user: config.DB.user,
    password: config.DB.password,
    database: config.DB.database
});

DB.getConnection(function (err, connection) {
    if (err) return console.log(color.red(`[DB] Connect error. ${err}`));
    connection.query(`SELECT 1 + 1 AS solution`, function (e, res) {
        if (e) return console.log(color.red(`[DB] Wrong DB. ${e}`));
    });
    console.log(color.green(`[DB] Connected successful.`))
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
            online = online + result[i].online;
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

system();
setInterval(system, 30000);

function system () {
    // setInterval(() => {
    //     axios.get('https://cdn.rage.mp/master/').then((response) => {
    //         DB.query('SELECT * FROM server_data', function (err, res) {
    //             if (res) {
    //                 let data = response.data;
    //                 for (var i = 0; i < res.length; i++) {
    //                     let serverInfo = data[res[i].ip + ':' + res[i].port];
    //                     DB.query("UPDATE server_data SET online = ? WHERE ip = ?", [serverInfo.players, res[i].ip]);
    //                 }
    //             } else {
    //                 console.log(`Error 15. Insert server ip and port into DB.`)
    //             }
    //         })
    //     })
    // }, 30000)

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