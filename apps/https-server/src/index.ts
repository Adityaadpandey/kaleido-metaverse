import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import user from "./routes/user.js";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();



const port = 5000;

app.get('/', (req, res) => {
    res.send('Hello World!');
})


app.use('/api/v1/auth/', user );

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
