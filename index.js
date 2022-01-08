const express = require('express')
const cors= require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000 ;

const app= express()

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nlpzidc.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const appointmentOptionsCollection = client.db("doctorsPortal").collection("appointmentOptions")
        
        app.get('/appointmentOptions',async (req, res)=>{
            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();
            res.send(options)
        })
    } finally {
        
    }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('doctors portal server is running')
})

app.listen(port, ()=>console.log(`doctors portal running on port ${5000} `))



