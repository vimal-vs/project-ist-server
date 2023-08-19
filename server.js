import { Storage } from "@google-cloud/storage";
import express from "express";
import cors from "cors";
import { format } from "util";
import Multer, { diskStorage } from "multer";
import bodyParser from "body-parser";
import { createConnection } from "mysql";
import 'dotenv/config'

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const multer = () => Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, //2mb max
    },
});

var storage = diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/temp')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});

var upload = multer({ storage: storage });

const cloudStorage = new Storage({
    keyFilename: `./service_account_key.json`,
    projectId: process.env.PROJECT_ID,
});

const bucketName = process.env.BUCKET_NAME;
const bucket = cloudStorage.bucket(bucketName);

const Files = new FormData();

app.post("/api/upload", upload.array("files"), (req, res) => {

    req.files.forEach(function (file) {
        if (!file) {
            res.status(400).send("No file uploaded.");
            return;
        }
        const blob = bucket.file(file.originalname);
        const blobStream = blob.createWriteStream();
        blobStream.on("error", (err) => {
            next(err);
        });
        blobStream.on("finish", () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            Files.append(file.originalname, publicUrl);
        });
        blobStream.end(file.buffer);
    })
    res.send('Files Uploaded').status(200);
});

app.post("/api/submit", (req, res) => {

    const data = req.body.data;

    const pool = createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    pool.connect();

    pool.query("INSERT INTO BioData VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", Object.values(data), (err) => {
        if (err) {
            console.log(err); //remove
            res.send(err.code);
        } else {
            console.log("Data Added Successfully."); //remove
            res.send('Data Added').status(200);
        }
    });

    pool.end();
});

app.listen(port, () => {
    console.log(`listening at => http://localhost:${port}`);
});