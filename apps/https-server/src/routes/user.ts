// import client from "@PrismaClient";
import { client } from "@repo/db/client";
import { Router } from "express";


// const client = new PrismaClient();
const user = Router();


// get the user by id
user.get('/:id', (req, res) => {

    res.send('Hello World!');
})

// create a new user
user.post('/', (req, res) => {
    console.log('req.body:', req.body);
    try {
        const { username, password, email, displayName, bio } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newUser = client.user.create({ data: { username, password, email, displayName, bio } });
        if (!newUser) {
            return res.status(400).json({ error: "Failed to create user" });
        }

        res.json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

// login a user
user.post('/login', (req, res) => {
    res.send('Hello World!');
})

// update a user
user.put('/:id', (req, res) => {
    res.send('Hello World!');
})

// delete a user
user.delete('/:id', (req, res) => {
    res.send('Hello World!');
})


export default user;
