import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import avatarRouter from './routes/avatar.js';
import elementRouter from "./routes/elements.js";
import friendshipRouter from './routes/friendship.js';
import inventoryRouter from './routes/inventory.js';
import spaceRouter from './routes/space.js';
import spaceInstanceRouter from './routes/spaceintst.js';
import userRouter from "./routes/user.js";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();



const port = 5000;

app.get('/', (req, res) => {
    res.send('Hello World!');
})


app.use('/api/v1/auth/', userRouter);
app.use('/api/v1/avatar', avatarRouter);
app.use('/api/v1/friendship', friendshipRouter);
app.use('/api/v1/element', elementRouter);
app.use('/api/v1/space', spaceRouter);
app.use('/api/v1/spaceinstance', spaceInstanceRouter);
app.use('/api/v1/inventory', inventoryRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
