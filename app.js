import express from 'express'

const app = express()
const PORT = 5000

app.use(express.static('public'))
app.listen(PORT, () => console.log(`The Server has been started on a port ${PORT}...`))