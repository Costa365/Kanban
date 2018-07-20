var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var db = mongojs('mongodb://localhost/tasklist');

// Get Tasks
router.get('/tasks', function (req, res, next) {
    db.tasks.find().sort({ date: -1, position: 1  }, function (err, tasks) {
        if (err) {
            res.send(err)
        }
        res.json(tasks);
    });
});

// Save Task
router.post('/task', function (req, res, next) {
    var task = req.body;
    if (!task.title || task.state != 'To Do') {
        res.status(400);
        res.json({
            "error": "Bad Data"
        });
    } else {
        task.position = 1;

        db.tasks.count({},function(err, count){
            if(count > 0) {
                db.tasks.find().limit(1).sort({ position: -1 }, function (err, tasks) {
                    if (err) {
                        res.send(err)
                    }
                    let nextPos = parseInt(tasks[tasks.length - 1].position, 10) + 1;
                    task.position = nextPos;
                    db.tasks.save(task, function (err, task) {
                        if (err) {
                            res.send(err)
                        }
                        res.json(task);
                    });
                });
            } else {
                task.position = 1;
                db.tasks.save(task, function (err, task) {
                    if (err) {
                        res.send(err)
                    }
                    res.json(task);
                });
            }
        });

        /*
        db.tasks.save(task, function (err, task) {
            if (err) {
                res.send(err)
            }
            res.json(task);
        }); */
    }
});

// Delete Task
router.delete('/task/:id', function (req, res, next) {
    db.tasks.remove({ _id: mongojs.ObjectId(req.params.id) }, function (err, task) {
        if (err) {
            res.send(err)
        }
        res.json(task);
    });
});

// Update Task
router.put('/task/:id', function (req, res, next) {
    var task = req.body;
    task._id = mongojs.ObjectId(task._id);

    db.tasks.save(task, function (err, task) {
        if (err) {
            res.send(err)
        }
        res.json(task);
    });
});

module.exports = router