const express = require('express')
const cors= require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt= require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000 ;

const app= express()

//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nlpzidc.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    // console.log('token', req.headers.authorization)
    const authHeader = req.headers.authorization;
    if(!authHeader){
        res.status(401).send({ message: 'unauthorized access' })
    }
    const token= authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if (err){
            res.status(401).send({message:'forbidden access'})
        }
        req.decoded= decoded;
        next()
    })
}

async function run() {
    try {
        const appointmentOptionsCollection = client.db("doctorsPortal").collection("appointmentOptions")
        const bookingCollection = client.db("doctorsPortal").collection("bookings")
        const usersCollection = client.db("doctorsPortal").collection("users")
        const doctorsCollection = client.db("doctorsPortal").collection("doctors")
        
        const verifyAdmin=async(req, res, next)=>{
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query)
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: "Forbidden Access " })
            }
            next();
        }
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

        app.get('/appointmentSpecialty', async(req, res)=>{
            const query={}
            const result= await appointmentOptionsCollection.find(query).project({name:1 }).toArray()
            res.send(result)
        })

        app.get('/bookings', verifyJWT,  async(req, res)=>{
            const email= req.query.email;
            const decodedEmail= req.decoded.email;
            if(email!==decodedEmail){
                return res.status(403).send({message:'forbidden access'})
            }           
            const query={email:email}
            const bookings= await bookingCollection.find(query).toArray();
            res.send(bookings)
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

        app.get('/jwt',async(req, res)=>{
            const email= req.query.email;
            const query={email:email}
            const user= await usersCollection.findOne(query)
            console.log(user)
            if(user){
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN,           { expiresIn: '60d' })
                return res.send({accessToken: token})
            }
            res.status(403).send({accessToken: ''})
        })

        app.get('/users', async(req, res)=>{
            const query={}
            const users= await usersCollection.find(query).toArray()
            res.send(users)
        })
        app.get('/users/admin/:email', async(req, res)=>{
            const email= req.params.email;
            const query={email};
            const user=await usersCollection.findOne(query)
            res.send({isAdmin: user?.role==='admin'})
        })

        app.post('/users', async(req, res)=>{
            const user= req.body;
            const result= await usersCollection.insertOne(user);
            res.send(result);
        })
        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async(req, res)=>{            
            const id= req.params.id;
            const filter= {_id:(ObjectId(id))}
            const options = { upsert: true };
            const updatedDoc={
                $set :{
                    role: 'admin'
                }
            }
            const result= await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        // app.get('/addPrice', async(req, res)=>{
        //     const filter = {  }
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             price : 99
        //         }
        //     }
        //     const result= await appointmentOptionsCollection.updateMany(filter, updatedDoc, options)
        //     res.send(result)

        // })

        app.get('/doctors', verifyJWT, verifyAdmin, async(req,res)=>{
            const query={}
            const doctors= await doctorsCollection.find(query).toArray()
            res.send(doctors)
        })
        app.post('/doctors',verifyJWT, async(req, res)=>{
            const doctor= req.body;
            const result= await doctorsCollection.insertOne(doctor);
            res.send(result)
        })

        app.delete('/doctors/:id', verifyJWT, async(req, res)=>{
            const id= req.params.id;
            const filter= {_id: ObjectId(id)}
            const result= doctorsCollection.deleteOne(filter)
            res.send(result)
        })

    } 
    finally {
        
    }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('doctors portal server is running')
})

app.listen(port, ()=>console.log(`doctors portal running on port ${5000} `))



