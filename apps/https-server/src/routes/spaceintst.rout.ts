import { Router } from "express";
// import { db } from "@repo/db";

const app = Router();


// get the user by id
app.get('/:id', (req, res) => {
    res.send('Hello World!');
})

// create a new user
app.post('/', (req, res) => {
    res.send('Hello World!');
})

// login a user
app.post('/login', (req, res) => {
    res.send('Hello World!');
})

// update a user
app.put('/:id', (req, res) => {
    res.send('Hello World!');
})

// delete a user
app.delete('/:id', (req, res) => {
    res.send('Hello World!');
})


export default app;
