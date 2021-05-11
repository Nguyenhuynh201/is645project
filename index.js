// Required modules 
require("dotenv").config();
const express = require("express");
const app = express();
const dblib = require("./dblib");
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
const multer = require("multer");
const upload = multer();

// Add middleware to parse default urlencoded form
app.use(express.urlencoded({ extended: false }));

// Setup EJS
app.set("view engine", "ejs");

// Enable CORS (see https://enable-cors.org/server_expressjs.html)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

// Application folders
app.use(express.static("public"));

// Start listener
app.listen(process.env.PORT || 3000, () => {
    console.log("Server started (http://localhost:3000/) !");
});

// Setup routes
app.get("/", (req, res) => {
    //res.send("Root resource - Up and running!")
    res.render("index");
});



app.get("/search", async (req, res) => {
  // Omitted validation check
  const totRecs = await dblib.getTotalRecords();
  //Create an empty customer object (To populate form with values)
  const cust = {
      cusid: "",
      cusfname: "",
      cuslname: "",
      cusstate: "",
      cussalesytd: "",
      cussalesprev: ""

  };
  res.render("search", {
      type: "get",
      totRecs: totRecs.totRecords,
      cust: cust
  });
});

app.post("/search", async (req, res) => {
  // Omitted validation check
  //  Can get this from the page rather than using another DB call.
  //  Add it as a hidden form value.
  const totRecs = await dblib.getTotalRecords();

  dblib.findCustomers(req.body)
      .then(result => {
          res.render("search", {
              type: "post",
              totRecs: totRecs.totRecords,
              foundRecs: result.result.length,
              result: result,
              cust: req.body
          })
      })
      .catch(err => {
          res.render("search", {
              type: "post",
              totRecs: totRecs.totRecords,
              result: `Unexpected Error: ${err.message}`,
              cust: req.body
          });
      });
});

app.get("/search", async (req, res) => {
    // Omitted validation check
    const totRecs = await dblib.getTotalRecords();
    //Create an empty customer object (To populate form with values)
    const cust = {
        cusid: "",
        cusfname: "",
        cuslname: "",
        cusstate: "",
        cussalesytd: "",
        cussalesprev: ""

    };
    res.render("search", {
        type: "get",
        totRecs: totRecs.totRecords,
        cust: cust
    });
});

// GET /edit/5
app.get("/edit/:id", (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM customer WHERE cusid = $1";
    pool.query(sql, [id], (err, result) => {
      // if (err) ...
      res.render("edit", { model: result.rows[0] });
    });
  });
  
  // POST /edit/5
  app.post("/edit/:id", (req, res) => {
    const id = req.params.id;
    const customer = [req.body.cusid, req.body.cusfname, req.body.cuslname,req.body.cusstate,req.body.cussalesytd,req.body.cussalesprev, id];
    const sql = "UPDATE Customer SET cusid = $1, cusfname = $2, cuslname = $3, cusstate = $4, cussalesytd = $5, cussalesprev = $6 WHERE (cusid = $7)";
    pool.query(sql, customer, (err, result) => {
      // if (err) ...
      res.redirect("/search");
    });
  });

// GET /delete
app.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM customer WHERE cusid = $1";
    pool.query(sql, [id], (err, result) => {
      // if (err) ...
      res.render("delete", { model: result.rows[0] });
    });
  });
  
  // POST /delete
  app.post("/delete/:id", (req, res) => {
    const id = req.params.id;
    const sql = `DELETE FROM customer WHERE cusid = $1`;
    pool.query(sql, [id], (err, result) => {
      // if (err) ...
      res.redirect("/search");
    });
  });
  
// GET /create
app.get("/create", (req, res) => {
  res.render("create", { model: {} });
});


// POST /create
app.post("/create", (req, res) => {
  const sql = "INSERT INTO Customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)";
  const customer = [req.body.cusid, req.body.cusfname, req.body.cuslname,req.body.cusstate,req.body.cussalesytd,req.body.cussalesprev];
  pool.query(sql, customer, (err, result) => {
    // if (err) ...
    res.redirect("/create");
  });
});



  // GET /input


 app.get("/input", async (req, res) => {
  // Omitted validation check
  var message = "";
  const totRecs = await dblib.getTotalRecords();
  res.render("input", {
      type: "get",
      totRecs: totRecs.totRecords,
      message: message
  });
});
 
   // POST /input

 app.post("/input",  upload.single('filename'), (req, res) => {

     if(!req.file || Object.keys(req.file).length === 0) {
         message = "Error: Import file not uploaded";
         return res.send(message);
     };
     //Read file line by line, inserting records
     const buffer = req.file.buffer; 
     const lines = buffer.toString().split(/\r?\n/);
     var recordsinserted = 0
     var recordsnotinserted = 0 
     lines.forEach(line => {
          //console.log(line);
          product = line.split(",");
          //console.log(product);
          const sql = "INSERT INTO Customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)";
          pool.query(sql, product, (err, result) => {
              if (err) {
                  recordsnotinserted ++;
                  console.log(`Insert Error.  Error message: ${err.message}`);
              } else {
                  recordsinserted ++;
                  console.log(`Inserted successfully`);
              }
         });
     });
     message = `Import Summary \n Records Processed: ${lines.length} records \n Records Inserted successfully: ${recordsinserted} \n Records Not Inserted: ${recordsnotinserted} \n Error:`;
     res.send(message);
 });


 app.get("/output", async (req, res) => {
  var message = "";
  const totRecs = await dblib.getTotalRecords();
  res.render("output",{ message: message, type: "get", totRecs: totRecs.totRecords });
 });
 
 
 
 
 app.post("/output", (req, res) => {
     const sql = "SELECT * FROM customer ORDER BY cusid";
     pool.query(sql, [], (err, result) => {
         var message = "";
         if(err) {
             message = `Error - ${err.message}`;
             res.render("output", { message: message })
         } else {
             var output = "";
             result.rows.forEach(customer => {
                 output += `${customer.cusid},${customer.cusfname},${customer.cuslname},${customer.cusstate},${customer.cussalesytd},${customer.cussalesprev}\r\n`;
             });
             res.header("Content-Type", "text/csv");
             res.attachment(`output.txt`);
             return res.send(output);
         };
     });
 });