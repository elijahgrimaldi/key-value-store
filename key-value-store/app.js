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

app.route("/hello")
    .get(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello',
            method: 'GET'
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

    .post(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello',
            method: 'POST'
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


    app.route("/hello/:name")
    .post(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello'+req.params.name,
            method: 'POST'
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
    .get(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello'+req.params.name,
            method: 'GET'
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

    
    app.route("/test")
    .get(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/test',
            method: 'GET'
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
    .post(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello?msg='+req.query.msg,
            method: 'POST'
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


    app.route("/kvs/:key")
    .put(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello'+req.params.key,
            method: 'PUT'
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
        })
        reqst.write(JSON.stringify(req.body));

        // End the request
        reqst.end();
    })
    .get(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello'+req.params.key,
            method: 'GET'
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
    .delete(function(req,res){
        const options = {
            hostname: '10.10.0.2',
            port: 8090,
            path: '/hello'+req.params.key,
            method: 'DELETE'
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



    app.listen(8090,function(){
        console.log("Running proxy on port 8083")
    })
}