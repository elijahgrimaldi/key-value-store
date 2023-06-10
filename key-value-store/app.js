const express = require("express")
const bodyParser = require("body-parser")
const app = express()
app.use(bodyParser.urlencoded({extended : true}))
const key_store = {}

function checkFind(object, key) {
    //checks if a key is in a given object
    var result = object[key];
    return (typeof result !== "undefined") ? true : false;
}

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








    app.listen(3000,function(){
        console.log("Server started on port 3000")
    })

}