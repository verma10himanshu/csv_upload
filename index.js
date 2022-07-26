// Import required module express, fast-csv, multer, mongodb and fs packages
const multer = require('multer');
const csv = require('fast-csv');
const mongodb = require('mongodb');
const fs = require('fs');
const express = require('express');
const app = express();

// Set global directory
global.__basedir = __dirname;

// Multer Upload Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __basedir + '/uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname)
    }
});

// Filter for CSV file
const csvFilter = (req, file, cb) => {
    if (file.mimetype.includes("csv")) {
        cb(null, true);
    } else {
        cb("Please upload only csv file.", false);
    }
};
const upload = multer({ storage: storage, fileFilter: csvFilter });

// Upload CSV file using Express Rest APIs
app.post('/api/upload-csv-file', upload.single("file"), (req, res) => {
    try {
        if (req.file == undefined) {
            return res.status(400).send({
                message: "Please upload a CSV file!"
            });
        }

        // Import CSV File to MongoDB database
        let csvData = [];
        let filePath = __basedir + '/uploads/' + req.file.filename;
        fs.createReadStream(filePath)
            .pipe(csv.parse({ headers: true }))
            .on("error", (error) => {
                throw error.message;
            })
            .on("data", (row) => {
                csvData.push(row);
            })
            .on("end", () => {

                // Establish connection to the database
                var url = "mongodb://localhost:27017/TestDb";
                var dbConn;
                mongodb.MongoClient.connect(url, {
                    useUnifiedTopology: true,
                }).then((client) => {
                    console.log('DB Connected!');
                    dbConn = client.db();

                    //inserting into the table "employees"
                    var collectionName = 'employees';
                    var collection = dbConn.collection(collectionName);
                    collection.insertMany(csvData, (err, result) => {
                        if (err) console.log(err);
                        if (result) {
                            res.status(200).send({
                                message:
                                    "Upload/import the CSV data into database successfully: " + req.file.originalname,
                            });
                            client.close();
                        }
                    });
                }).catch(err => {
                    res.status(500).send({
                        message: "Fail to import data into database!",
                        error: err.message,
                    });
                });
            });
    } catch (error) {
        console.log("catch error-", error);
        res.status(500).send({
            message: "Could not upload the file: " + req.file.originalname,
        });
    }
});

// Fetch all employees
app.get('/api/employees', function (req, res) {
    // Establish connection to the database
    var url = "mongodb://localhost:27017/TestDb";
    var dbConn;
    mongodb.MongoClient.connect(url, {
        useUnifiedTopology: true,
    }).then((client) => {
        dbConn = client.db();
        
        var collectionName = 'employees';
        var collection = dbConn.collection(collectionName);
        collection.find().toArray(function(err, result) {
            if (err) throw err;
            res.status(200).send({employees : result});
            client.close();
          });
    }).catch(err => {
        res.status(500).send({
            message: "Fail to fetch data from database!",
            error: err.message,
        });
    });
});

// Create a Server
let server = app.listen(5000, function () {
    let port = server.address().port;
    console.log("App Server running at - http://localhost:%s", port);
});