var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var db = mongojs('mongodb://localhost/tasklist')

// Get Tasks
router.get('/tasks', function(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    db.tasks.find().sort({_id: 1}, function(err, tasks){
        if(err){
            res.send(err)
        }
        res.json(tasks);
    });
});

// Save Task
router.post('/task', function(req, res, next){
    var task = req.body;

    if(!task.title || task.state != 'To Do'){
        res.status(400);
        res.json({
            "error": "Bad Data"
        });
    } else {
        db.tasks.save(task, function(err, task){
            if(err){
                res.send(err)
            }
            res.json(task);
        });
    }
});

// Delete Task
router.delete('/task/:id', function(req, res, next){
    db.tasks.remove({_id: mongojs.ObjectId(req.params.id)}, function(err, task){
        if(err){
            res.send(err)
        }
        res.json(task);
    });
});

// Update Task
router.put('/task/:id', function(req, res, next){
    var task = req.body;
    var updatedTask = {}
    
    updatedTask.title = task.title;
    updatedTask.state = task.state;

    db.tasks.update({_id: mongojs.ObjectId(req.params.id)}, updatedTask, {}, function(err, task){
        if(err){
            res.send(err)
        }
        res.json(tasks);
    });
});


module.exports = router