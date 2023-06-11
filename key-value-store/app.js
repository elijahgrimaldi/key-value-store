const express = require("express")
const http = require('http')
const bodyParser = require("body-parser")
const app = express()
app.use(bodyParser.urlencoded({extended : true}))
const key_store = {}

function checkFind(object, key) {
    //checks if a key is in a given object
    var result = object[key];
    return (typeof result !== "undefined") ? true : false;
}

if (!process.env.FORWARDING_ADDRESS){

main().catch(err => console.log(err));

async function main() {
    app.route("/hello")
    .get(function(req,res){
        res.status(200).json({
            "message":"world"
        })
    })
    app.route("/hello")
    .post(function(req,res, next){
        const err = new Error('Method Not Allowed');
        err.status = 405;
        next(err);
    })


    app.route("/hello/:name")
    .post(function(req,res){
        res.status(200).json({
            "message":"Hi, "+req.params.name
        })
    })
    .get(function(req,res){
        const err = new Error('Method Not Allowed');
        err.status = 405;
        next(err);
    })

    
    app.route("/test")
    .get(function(req,res){
        res.status(200).json({
            "message":"test is successful"
        })
    })
    .post(function(req,res,next){
        if(!req.query.msg) {
            const err = new Error('Unkown query parameter');
            err.status = 400;
            next(err);
        }else{
        res.status(200).json({
            "message":req.query.msg
        })}
    })


    app.route("/kvs/:key")
    .put(function(req,res){
        if (req.params.key.length > 50){
            res.status(400).json({"error" : "Key is too long"})
        }else{
            if (!checkFind(req.body,"value")){
                res.status(400).json({"error" : "PUT request does not specify a value"})
            }else{
            
            if (!checkFind(key_store, req.params.key)){
                key_store[req.params.key] = req.body.value
                res.status(201).json({"result" : "created"})
            }else{
                key_store[req.params.key] = req.body.value
                res.status(200).json({"result" : "replaced"})
            }
        }
    }
    })
    .get(function(req,res){
        if (!checkFind(key_store, req.params.key)){
            res.status(404).json({"error" : "Key does not exist"})
        } else{
            res.status(200).json({"result" : "found", "value" : key_store[req.params.key]})
        }
    })
    .delete(function(req,res){
        if (!checkFind(key_store, req.params.key)){
            res.status(404).json({"error" : "Key does not exist"})
        } else{
            delete key_store[req.params.key]
            res.status(200).json({"result" : "deleted"})
        }
    })








    app.listen(8090,function(){
        console.log("Running main on port 8082")
    })

}
//-------------------------------------------------------PROXY-------------------------------------------------------------

} else{
//     https.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', (resp) => {
//     let data = '';

//     // A chunk of data has been received.
//     resp.on('data', (chunk) => {
//     data += chunk;
//   });
// })
app.route("/hello")
    .get(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello'
          };
          const reqst = http.request(options, (resp) => {
            let data = ''
             
            resp.on('data', (chunk) => {
                data += chunk;
            });
            
            // Ending the response 
            resp.on('end', () => {
                res.send(JSON.parse(data))
            });
               
        }).on("error", (err) => {
            res.send("Error: ", err)
        }).end()
})
//     app.route("/hello")
//     .post(function(req,res){
//         const options = {
//             host: '10.10.0.2',
//             port: 8082,
//             path: '/hello',
//             method: "POST"
//           }
          
//           http.request(options, function(resp) {
//             res.send(resp)
//     })
//     })


//     app.route("/hello/:name")
//     .post(function(req,res){

//     })
//     .get(function(req,res){
//         const data = getSave("/hello/"+req.params.name)
//         res.send(data)
//     })

    
//     app.route("/test")
//     .get(function(req,res){
//         const data = getSave("/test")
//         res.send(data)
//     })
//     .post(function(req,res){

//     })


//     app.route("/kvs/:key")
//     .put(function(req,res){

//     })
//     .get(function(req,res){
//         const data = getSave("/kvs/"+req.params.key)
//         res.send(data)

//     })
//     .delete(function(req,res){

//     })



    app.listen(8090,function(){
        console.log("Running proxy on port 8083")
    })
}