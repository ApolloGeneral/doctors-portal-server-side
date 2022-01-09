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
        const bookingCollection = client.db("doctorsPortal").collection("bookings")
        
        app.get('/appointmentOptions',async (req, res)=>{
            const date = req.query.date;
            console.log(date);
            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();
            const bookingQuery={appointmentDate: date}
            const alreadyBooked= await bookingCollection.find(bookingQuery).toArray();
            options.forEach(option=>{
                const optionBooked= alreadyBooked.filter(book=> book.treatment=== option.name  )
                const bookedSlots= optionBooked.map(book=> book.slot )
                const remainingSlots= option.slots.filter(slot=> !bookedSlots.includes(slot))
                option.slots= remainingSlots;
                console.log(date, option.name, remainingSlots.length)
            })
            res.send(options)
        })

        app.post('/bookings', async(req, res)=>{
            const booking= req.body
            // console.log(booking)
            const query={
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment 
            }
            const alreadyBooked= await bookingCollection.find(query).toArray();
            if (alreadyBooked.length){
                const message=`You already have a booking on ${booking.appointmentDate} for ${booking.treatment}`
                return res.send({acknowledged: false, message})
            }
            const result= await bookingCollection.insertOne(booking)
            res.send(result)
        })
    } finally {
        
    }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('doctors portal server is running')
})

app.listen(port, ()=>console.log(`doctors portal running on port ${5000} `))



