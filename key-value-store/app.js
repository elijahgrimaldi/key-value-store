const express = require("express")
const axios = require('axios')
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
    .get(function(req,res,next){
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
        console.log(req.body)
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
        axios.get('http://10.10.0.2:8090/hello')
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            res.send(error);
        })
    })

    .post(function(req, res) {
        axios.post('http://10.10.0.2:8090/hello')
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            res.status(error.response.status).send(error.response.statusText)
        })
    })

    app.route("/hello/:name")
    .post(function(req,res){
        axios.post('http://10.10.0.2:8090/hello/'+req.params.name)
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            res.send(error);
        })
    })
    .get(function(req,res){
        axios.get('http://10.10.0.2:8090/hello/'+req.params.name)
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            res.status(error.response.status).send(error.response.statusText)
        })
    })

    
    app.route("/test")
    .get(function(req,res){
        axios.get('http://10.10.0.2:8090/test')
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            res.send(error);
        })
    })
    .post(function(req,res){
        if (typeof(req.query.msg) !== 'undefined'){
            var newPath = '/test?msg='+req.query.msg
        }else{
            var newPath = '/test'
            }
            axios.post('http://10.10.0.2:8090'+newPath)
            .then(function (response) {
                // handle success
                res.status(response.status).send(response.data)
            })
            .catch(function (error) {
                // handle error
                res.status(error.response.status).send(error.response.statusText)
            })
    })


    app.route("/kvs/:key")
    .put(function(req,res){
        console.log(typeof(req.body))
        axios.put('http://10.10.0.2:8090/kvs/'+req.params.key, req.body,{
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }})
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            console.log(error)
            res.status(error.response.status).send(error.response.data)
        })
    })
    .get(function(req,res){
        axios.get('http://10.10.0.2:8090/kvs/'+req.params.key)
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            res.status(error.response.status).send(error.response.data)
        })
    })
    .delete(function(req,res){
        axios.delete('http://10.10.0.2:8090/kvs/'+req.params.key)
        .then(function (response) {
            // handle success
            res.status(response.status).send(response.data)
        })
        .catch(function (error) {
            // handle error
            res.status(error.response.status).send(error.response.data);
        })
    })


    app.listen(8090,function(){
        console.log("Running proxy on port 8083")
    })
}