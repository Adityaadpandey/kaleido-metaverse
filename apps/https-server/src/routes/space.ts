import { Router } from "express";

const app = Router();


// get the space by id
app.get('/:id', (req, res) => {
    res.send('Hello World!');
})

// create a new space
app.post('/', (req, res) => {
    res.send('Hello World!');
})


// update a space
app.put('/:id', (req, res) => {
    res.send('Hello World!');
})

// delete a space
app.delete('/:id', (req, res) => {
    res.send('Hello World!');
})

// get all users in a space but should be a socket connection
app.get("/:id/users/", (req, res) => {
    res.send("Hello World!");
});


export default app;
