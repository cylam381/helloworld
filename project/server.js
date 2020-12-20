const express = require('express');
const formidable = require('express-formidable');
const app = express();
const session = require('cookie-session');
const bodyParser = require('body-parser');


const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const ExpressFormidable = require('express-formidable');
const mongourl = '';
const dbName = 'test';


app.set('view engine','ejs');


const SECRETKEY = 'I want to pass COMPS381F';

const users = new Array(
	{name: 'demo', password: ''},
	{name: 'student', password: ''}
);

app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY]
}));

// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));





const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('restaurants').find(criteria);
    cursor.toArray((err,docs) => {
        assert.equal(err, null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const handle_Find = (res, criteria, req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db,criteria,(docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('secrets', {name: req.session.username, nRestaurants: docs.length, restaurants: docs});
        });
    });
}

const handle_Search = (res, criteria, req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null,err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        var DOCID = {};

        if (criteria.name != "") {
            DOCID['name'] = criteria.name;
        } else if (criteria.borough != "") {
            DOCID['borough'] = criteria.borough;
        } else if (criteria.cuisine != "") {
            DOCID['cuisine'] = criteria.cuisine;
        }

        findDocument(db, DOCID, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('result', {nRestaurants: docs.length, restaurants: docs});

        });
    });
}


const handle_Details = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db,DOCID,(docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', {restaurant: docs[0], zoom: 15});

        });
    });
}

const uploadDocument = (uploadDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection('restaurants').insertOne(uploadDoc,(err,results) => {
            client.close();
            assert.equal(null, err);
            callback();
        });
    });

}


const handle_Create = (req, res, criteria) => {
 
    var uploadDoc = {};
    uploadDoc['restaurant_id'] = req.fields.restaurant_id;
    uploadDoc['name'] = req.fields.name;
    uploadDoc['borough'] = req.fields.borough;
    uploadDoc['cuisine'] = req.fields.cuisine;
    uploadDoc['street'] = req.fields.street;
    uploadDoc['building'] = req.fields.building;
    uploadDoc['zipcode'] = req.fields.zipcode;
    uploadDoc['coord']= [req.fields.lon, req.fields.lat];
    uploadDoc['owner'] = req.fields.owner;

    if (req.files.photo.size > 0) {
        fs.readFile(req.files.photo.path, (err,data) => {
            assert.equal(null, err);
            uploadDoc['photo'] = new Buffer.from(data).toString('base64');
            uploadDocument(uploadDoc, () => {
                res.status(200).render('info', {});
            })
        })
    } else {
        uploadDocument(uploadDoc, () => {
            res.status(200).render('info', {});
        });
    }
}

const handle_Edit = (res,criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null,err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);

        let cursor = db.collection('restaurants').find(DOCID);
        cursor.toArray((err,docs) => {
            client.close();
            assert.equal(null, err);
            res.status(200).render('edit', {restaurant: docs[0]});

        });
    });
}

const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection('restaurants').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(null, err);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res, criteria) => {
    var DOCID = {};
    DOCID['_id'] = ObjectID(req.fields._id);
    
    var updateDoc = {};
    updateDoc['restaurant_id'] = req.fields.restaurant_id;
    updateDoc['name'] = req.fields.name;
    updateDoc['borough'] = req.fields.borough;
    updateDoc['cuisine'] = req.fields.cuisine;
    updateDoc['street'] = req.fields.street;
    updateDoc['building'] = req.fields.building;
    updateDoc['zipcode'] = req.fields.zipcode;
    updateDoc['coord']= [req.fields.lon, req.fields.lat];
    updateDoc['owner'] = req.fields.owner;


    if (req.files.photo.size > 0) {
        fs.readFile(req.files.photo.path, (err,data) => {
            assert.equal(null, err);
            updateDoc['photo'] = new Buffer.from(data).toString('base64');
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('update', {message: `Updated ${results.result.nModified} document(s)`});
            });
        });
    } else {
        updateDocument(DOCID, updateDoc, (results) => {
            res.status(200).render('update', {message: `Updated ${results.result.nModified} document(s)`});
        });
    }
}


const deleteDocument = (db, deleteDoc, callback) => {
    db.collection('restaurants').deleteOne(deleteDoc, (err,results) => {
        assert.equal(null, err);
        callback(results)
    });
}


const handle_Delete = (res, criteria) => {
    const client = new MongoClient(mongourl);
    console.log("delete");
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {}
        DOCID['_id'] = ObjectID(criteria._id);
        deleteDocument(db,DOCID,(results)=> {
            client.close();
            res.status(200).render('delete', {message: `Deleted ${results.result.n} document(s)`});
        });

    });
}


app.get('/', (req,res) => {
	console.log(req.session);
	if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
	} else {
        handle_Find(res, req.query, req);   //main page
		//res.status(200).render('secrets',{name:req.session.username});
	}
});

app.get('/login', (req,res) => {
	res.status(200).render('login',{});
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.body.name && user.password == req.body.password) {
			// correct user name + password
			// store the following name/value pairs in cookie session
			req.session.authenticated = true;        // 'authenticated': true
			req.session.username = req.body.name;	 // 'username': req.body.name		
		}
	});
	res.redirect('/');
});

app.get('/logout', (req,res) => {
	req.session = null;   // clear cookie-session
	res.redirect('/');
});

app.get('/create', (req,res) => {
    res.status(200).render('create',{owner:req.session.username});
});

app.use('/create',formidable());

app.post('/create', (req,res) => {
    handle_Create(req,res,req.query);
});

app.get('/details', (req,res) => {
    handle_Details(res,req.query);
});

app.get('/edit', (req,res) => {
    handle_Edit(res,req.query);
});

app.use('/update',formidable());

app.post('/update', (req,res) => {
    handle_Update(req,res,req.query);
});

app.get('/delete', (req,res) => {
    handle_Delete(res,req.query);

});

app.get('/search', (req,res) => {
    res.status(200).render('search',{});
});

app.get('/result', (req,res) => {
    handle_Search(res,req.query,req);
});


app.listen(process.env.PORT || 8099);