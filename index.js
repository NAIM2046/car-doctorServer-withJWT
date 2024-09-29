const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken') ;
const cookieParser = require('cookie-parser')


require('dotenv').config()
console.log(process.env.DB_PASS)

const app = express();
const port = process.env.PORT || 5000;
app.use(cookieParser()) ;
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true 
}));
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hfxak.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//middewares
const logger =  async(req , res , next) =>{
    console.log('call:' , req.host , req.originalUrl) 
    next() ;
}
const verifyToken = async(req , res , next)=>{
    const token =  req.cookies?.token ; 
    //console.log(token) ;
     if(!token){
        return res.status(401).send({message: 'unauthorized access'}) ;
     }
    jwt.verify(token , process.env.ASSESS_TOKEN , (err , decoded)=>{
       
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
   // next() ;
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollections = client.db('carDoctor').collection('services');
       const bookingCollections =  client.db('carDoctor').collection('booking') ;

           //auth related API
           app.post('/jwt' , (req, res) =>{
            const user = req.body ; 
            console.log(user) ;
            const token =  jwt.sign(user,process.env.ASSESS_TOKEN,{expiresIn: '1h'})

            res
            .cookie('token' , token , {
                httpOnly: true,
                secure: false , 
                
            })
            .send({success: true}) 
           })


        // Send a ping to confirm a successful connection
        app.get('/services', async (req, res) => {
            const cursor = serviceCollections.find();
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get('/services/:id' , async(req  , res)=>{
          const id =  req.params.id ; 
          const query =  {_id : new ObjectId(id)} ;
          const option =  {
            projection: {title:1 , price:1 , img:1 , _id:1 }
          }
          const result =  await serviceCollections.findOne(query , option) ;
          res.send(result) ;
        })

    //booking 


    app.get('/bookings' ,verifyToken,  async(req , res)=>{
        console.log(req.query.email)
        //console.log('tok tok token',req.cookies.token)
       console.log('user in the valid token',req.user)  ;

       if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden access'}) ;
       }
        let query ={}        
        if(req.query?.email){
            query = {email: req.query.email}
        }
        const result =  await bookingCollections.find(query).toArray() ;
        res.send(result) ;

    })

    app.post('/bookings' , async(req, res)=>{
         const booking =  req.body ;
         console.log(booking) ;
         const result =  await bookingCollections.insertOne(booking) ;
         res.send(result) ;
    })

      
    app.patch('/bookings/:id' ,async (req , res)=>{
        const id = req.params.id ; 
        const filter = {_id: new ObjectId(id)} 
        const updatabooking =  req.body ; 
        console.log(updatabooking) ;
      const updateDoc = {
        $set: {
            status: updatabooking.status 
        },
      };
      const result =  await bookingCollections.updateOne(filter , updateDoc) ;

      res.send(result) ;
     })


    app.delete('/bookings/:id' ,async (req , res)=>{
        const id = req.params.id ; 
        const query = {_id : new ObjectId(id)} ;
        const results = await bookingCollections.deleteOne(query)
        res.send(results) ;
     })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Doctor is running ")
})

app.listen(port, () => {
    console.log(`car Doctor server is running on port ${port}`)
})

