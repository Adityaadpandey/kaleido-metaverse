import cors from 'cors';
import express from 'express';

import user from "./routes/user";
const app = express();

app.use(cors()); // Enable CORS if using frontend requests
app.use(express.json()); const port = 5000;

app.get('/', (req, res) => {
    res.send('Hello World!');
})


app.use('/api/v1/auth/', user );

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
