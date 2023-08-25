import { Storage } from "@google-cloud/storage";
import express from "express";
import cors from "cors";
import { format } from "util";
import Multer, { diskStorage } from "multer";
import bodyParser from "body-parser";
import { createConnection } from "mysql";
import 'dotenv/config';

const app = express();
const port = 3001;

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
    optionSuccessStatus: 200
}

app.use(cors(corsOptions));
app.use(bodyParser.json());

const multer = () => Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

var storage = diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/temp');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

var upload = multer({
    storage: storage,
}).fields([
    {
        name: 'StudentPhoto', maxCount: 1
    }, {
        name: 'FatherGuardianPhoto', maxCount: 1
    }, {
        name: 'MotherPhoto', maxCount: 1
    }, {
        name: 'StudentSignature', maxCount: 1
    }, {
        name: 'ParentSignature', maxCount: 1
    }, {
        name: 'TransferCertificate', maxCount: 1
    }, {
        name: 'SSLCCertificate', maxCount: 1
    }, {
        name: 'HSCFirstYearCertificate', maxCount: 1
    }, {
        name: 'HSCSecondYearCertificate', maxCount: 1
    }, {
        name: 'MigrationCertificate', maxCount: 1
    }, {
        name: 'CommunityCertificate', maxCount: 1
    }, {
        name: 'ProvisionalAllotmentLetter', maxCount: 1
    }, {
        name: 'AffidavitByStudent', maxCount: 1
    }, {
        name: 'AffidavitByParent', maxCount: 1
    }
]);

const cloudStorage = new Storage({
    keyFilename: `./service_account_key.json`,
    projectId: process.env.PROJECT_ID
});

const bucket = cloudStorage.bucket(process.env.BUCKET_NAME);

app.post("/api/upload/:reg", upload, (req, res) => {

    const folderName = req.params;
    const files = req.files;

    Object.keys(files).map((f) => {

        const fileArray = files[f];
        const file = fileArray[0];

        if (!file) {
            res.status(400).send("No file uploaded.");
            return;
        }
        const blob = bucket.file(folderName.reg + '/' + file.fieldname + '/' + file.originalname);
        const blobStream = blob.createWriteStream();

        blobStream.on("error", (err) => {
            next(err);
        });
        blobStream.on("finish", () => {
            const publicURL = format(`https://storage.cloud.google.com/${bucket.name}/${folderName.reg}/${file.fieldname}/${file.originalname}`);
        });
        blobStream.end(file.buffer);
    })
    res.send('Files Uploaded').status(200);
});

app.post("/api/submit/:reg", (req, res) => {

    const data = req.body.data;

    const pool = createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    pool.connect();

    pool.query("INSERT INTO Data VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", Object.values(data), (err) => {
        if (err) {
            res.send(err.code);
        }
        else {
            res.send('Data Added').status(200);
        }
    });

    pool.end();
});

app.listen(port);