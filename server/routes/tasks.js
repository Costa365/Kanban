var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var db = mongojs('mongodb://localhost/tasklist');

// Get Tasks
router.get('/tasks', function (req, res, next) {
    db.tasks.find().sort({ _id: 1 }, function (err, tasks) {
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
        db.tasks.find().limit(1).sort({ _id: -1 }, function (err, tasks) {
            if (err) {
                res.send(err)
            }
            let nextId = parseInt(tasks[tasks.length - 1]._id, 10) + 1;
            task._id = nextId;
            db.tasks.save(task, function (err, task) {
                if (err) {
                    res.send(err)
                }
                res.json(task);
            });
        });
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
    var updatedTask = {}

    updatedTask.title = task.title;
    updatedTask.state = task.state;
    updatedTask._id = parseInt(task._id);

    db.tasks.save(updatedTask, function (err, updatedTask) {
        if (err) {
            res.send(err)
        }
        res.json(updatedTask);
    });
});


module.exports = router