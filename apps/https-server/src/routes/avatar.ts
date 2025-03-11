import { Router } from "express";
// import { db } from "@repo/db";

const app = Router();


// get the user avatar
app.get('/:id', (req, res) => {
    res.send('Hello World!');
})

// create a new avatar
app.post('/', (req, res) => {
    res.send('Hello World!');
})


// update a avatar
app.put('/:id', (req, res) => {
    res.send('Hello World!');
})

// delete a avatar
app.delete('/:id', (req, res) => {
    res.send('Hello World!');
})


export default app;
