require("dotenv").config();
const express = require("express");
const app = express();
const { Client } = require("pg");
//const {db}= require('@vercel/postgres')
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

const database = new Client({
  user: "postgres",
  host: "localhost",
  database: "hngdatabase",
  password: "180602",
  port: 5432,
});
database
  .connect()
  .then(() => {
    console.log("connected");
  })
  .catch((e) => {
    console.log("failed");
  });

app.listen(8000, () => {
  console.log("listening");
});



//TABLE CREATION

 database.query(`CREATE TABLE IF NOT EXISTS Users
     (
     userid SERIAL PRIMARY KEY NOT NULL UNIQUE,
	firstname VARCHAR(30) NOT NULL,
	lastname VARCHAR(30) NOT NULL,
	email VARCHAR(30) UNIQUE NOT NULL,
	password VARCHAR(200) NOT NULL,
	phone VARCHAR(30) NOT NULL
 )`)
 .then(()=>{
     console.log(" user created")
     //database.end()
 })
 .catch((e)=>{

     console.log("failed to create")

 })

database.query(`CREATE TABLE IF NOT EXISTS organization
        (
        orgid SERIAL PRIMARY KEY UNIQUE,
    	    name VARCHAR(30) NOT NULL,
    	    description VARCHAR(100)
     )`)
     .then(()=>{
        console.log("organization created")
         //database.end()
     })
     .catch((e)=>{

         console.log("failed to create organization")

   })

database.query(`CREATE TABLE IF NOT EXISTS user_org
        (
        user_orgid SERIAL PRIMARY KEY UNIQUE,
    	   owneruserid INTEGER REFERENCES Users(userid),
          otheruserid INTEGER REFERENCES Users(userid),
          organid INTEGER REFERENCES organization(orgid) NOT NULL

     )`)
     .then(()=>{
        console.log("user org created")
         //database.end()
     })
     .catch((e)=>{

         console.log("failed to create user org")
         console.log(e)

   })

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    } else {
      req.user = user;
      next();
    }
  });
}

app.get('/', (req,response)=>{
    response.send({
        welcome: "you are welcome to my authentication app. you may proceed :)"
    })
})


//done
    app.post("/auth/register", async(req,response)=>{
        let user;
        let accessToken;
        const {firstName, lastName, email, password, phone}= req.body
        const {description}= req.body
        database.query(
            ` SELECT * FROM users WHERE email=$1 `,
            [email],
            (err, res) => {
              if (err) {
                console.error("notselected");
            
              } else {
                 if(res.rows[0]){
                    response.send( {errors: [
                        {
                          field: "string",
                          message: "email already exists",
                        },
                      ],

                 })
                 }
              }
            }
        )
        const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  console.log(hash)
  
        database.query(`INSERT INTO Users (firstname,lastname,email,password,phone)
            VALUES ($1,$2, $3, $4, $5)`, [firstName,lastName,email,hash,phone]
        )
        .then(()=>{
            console.log("inserted")

            database.query(
                ` SELECT * FROM users WHERE email=$1 `,
                [email],
                (err, res) => {
                  if (err) {
                    console.error("notselected");
                
                  } else {
                     user ={name: res.rows[0].userid}
                     accessToken= jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' } )
                  }
                }
            )




            database.query(`INSERT INTO organization (name,description)
                VALUES ($1, $2)`, [`${firstName}'s organization`,description]
            )
            .then(()=>{
                console.log("organization inserted")

            })
            .catch((e)=>{
                console.log("organization insertion failed")
            })

            database.query(
                ` SELECT * FROM organization WHERE name=$1 `,
                [`${firstName}'s organization`],
                (err, res) => {
                  if (err) {
                    console.error("notselected");
                
                  } else {
                     
                    database.query(`INSERT INTO user_org (owneruserid, organid)
                        VALUES ($1, $2)`, [user.name,res.rows[0].orgid]
                    )
                    .then(()=>{
                        console.log("user_org inserted")
        
                        response.send({
                            "status": "success",
                            "message": "Registration successful",
                            "data": {
                              "accessToken": accessToken,
                              "user": {
                                  "userId": user.name,
                                  "firstName": firstName,
                                        "lastName": lastName,
                                        "email": email,
                                        "phone": phone,
                              }
                            }
                        })
        
                    })
                    .catch((e)=>{
                        console.log("user_org insertion failed")
                    })

                  }
                }
            )
        })
        .catch((e)=>{
            console.log("failed to insert")
            console.log(e)
            response.send( {
                "status": "Bad request",
                "message": "Registration unsuccessful",
                "statusCode": 400,
                 "errors": [
                {
                  "field": "string",
                  "message": "string"
                },
              ]
            }
           )
        })
    })

// //done
app.post("/auth/login", async (req, response) => {
  const { email, password } = req.body;
  database.query(
    ` SELECT * FROM Users WHERE email=$1`,
    [email],
    async (err, res) => {
      if (err) {
        console.error("notselected");
      } else {
        const valid = await bcrypt.compare(password, res.rows[0].password);
        if (valid) {
          const user = { name: res.rows[0].userId };
          const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "4h",
          });

          response.send({
            status: "success",
            message: "Login successful",
            data: {
              accessToken: accessToken,
              user: {
                userId: res.rows[0].userId,
                firstName: res.rows[0].firstname,
                lastName: res.rows[0].lastname,
                email: res.rows[0].email,
                phone: res.rows[0].phone,
              },
            },
          });
        } else {
          response.send({
            status: "Bad request",
            message: "Authentication failed",
            statusCode: 401,
            errors: [
              {
                field: "string",
                message: "string",
              },
            ],
          });
        }
      }
    }
  );
});

//completed    
app.get("/api/users/:id", authenticateToken,(req, response) => {
  const user=req.user.name
  const {id}= req.params
  let user_org_arr = [];
  let user_org_arr2 = [];
  database.query(
    `SELECT * FROM user_org WHERE owneruserid=$1 OR otheruserid=$1`,
    [user],
    (err, res) => {
      if (err) {
        response.send({
          errors: [
            {
              field: "string",
              message: err.message,
            },
          ],
        });
      } else {
        console.log("heyyy",res.rows)
        const len1 = res.rows.length;
        for (let i = 0; i < len1; i++) {
          user_org_arr.push(res.rows[i].organid);
        }
        const len2 = user_org_arr.length;
        for (let i = 0; i < len2; i++) {
          database.query(
            `SELECT * FROM user_org WHERE organid=$1 AND (owneruserid=$2 OR otheruserid=$2)`,
            [user_org_arr[i], id],
            (err, res) => {
              if (err) {
                console.log("user not found yet");
              } else {
                if(res.rows[0]){
                console.log("present", res.rows)
               
               if ((res.rows[0].owneruserid ==id) || (res.rows[0].otheruserid == 0))  {
                user_org_arr2.push(id)
               
               }
            }
else{response.send({
    errors: [
        {
          field: "string",
          message: "no user currently belongs to any organisations you are currently in",
        },
      ],
})}


            }

            if(i==(len2-1)){
  database.query(
    `SELECT * FROM Users WHERE userId=$1`,
    [user_org_arr2[0]],
    (err, res) => {
      if (err) {
        console.log("failed");
      } else {
        const userr={
            userId: res.rows[0].userid,
            firstName: res.rows[0].firstname,
            lastName: res.rows[0].lastname,
            email: res.rows[0].email,
            phone: res.rows[0].phone,
          }
        response.send({
          status: "success",
          message: "selected user in organization you created or belong to",
          data: userr
        });
      }
    }
  );
            }

}
          )
}
      }
})
})




//completed  
app.get("/api/organisations",  authenticateToken,async(req, response) => {
  const user=req.user.name
  let user_org_arr = [];
  let org_arr = [];
   database.query(
    `SELECT * FROM user_org WHERE owneruserid=$1 OR otheruserid=$1`,
    [user],
     (err, res) => {
      if (err) {
        console.log("notselected");
       response.send({
          errors: [
            {
              field: "string",
              message: "string",
            },
          ],
        });
      } else {
        console.log("selected");
        const len1 = res.rows.length;
        for (let i = 0; i < len1; i++) {
          user_org_arr.push(res.rows[i].organid);
        }
       const len2 = user_org_arr.length;
       for(let i = 0; i < len2; i++) {
          database.query(
            `SELECT * FROM organization WHERE orgid=$1`,
            [user_org_arr[i]],
            (err, res) => {
              if (err) {
                console.error("notselected");
              } else {
               org_arr.push(res.rows[0]);
              }
              if(i==(len2-1)){
 response.send({
           "status": "success",
           "message": "A complete list of all organisations this user created or belongs to ",
           "data": {
             "organisations": org_arr,
           },
     })
            }
            }
          )
        }
     }
})
})



//completed  
app.get("/api/organisations/:orgId", authenticateToken, (req, response) => {
  const { orgId } = req.params;
  database.query(
    ` SELECT * FROM organization WHERE orgId=$1 `,
    [orgId],
    (err, res) => {
      if (err) {
        console.error("notselected");
        response.send({
          errors: [
            {
              "field": "string",
              "message": err.message,
            },
          ],
        });
      } else {
        console.log("selected");
        if(res.rows[0]){
        response.send({
          "status": "success",
         " message": "contents of the selected organiation",
          "data":   res.rows[0]
        })}
        else{  response.send({
            errors: [
              {
                "field": "string",
                "message": "organization does not exist",
              },
            ],
          }); };
      }
    }
  );
});


//completed   
app.post("/api/organisations",authenticateToken,  (req, response) => {
  const { name, description } = req.body;
 const user = req.user.name;
  database.query(
      `INSERT INTO organization (name,description)
                VALUES ($1, $2)`,
      [name, description]
    )
    .then(() => {
      console.log("organization inserted");


      database.query(
        ` SELECT * FROM organization WHERE name=$1 `,
        [name],
        (err, res) => {
          if (err) {
            console.error("notselected");
        
          } else {


      database.query(
          `INSERT INTO user_org (owneruserid, organid)
                    VALUES ($1, $2)`,
          [user, res.rows[0].orgid]
        )
        .then(() => {
          console.log("user_org  for organization inserted");
          response.send({
            status: "success",
            message: "Organisation created successfully",
            data: {
              orgId: res.rows[0].orgid,
              name: name,
              description: description,
            },
          });
        })
        .catch((e) => {
          console.log("user_org insertion failed");
          console.log(e)
        });
    }})
    })
    .catch((e) => {
      console.log("organization insertion failed");
      response.send({
        status: "Bad Request",
        message: "Client error",
        statusCode: 400,
        errors: [
          {
            field: "string",
            message: e.message,
          },
        ],
      });
    });
});


//completed
app.post("/api/organisations/:orgId/users", (req, res) => {
  const { orgId } = req.params;
  const { userId } = req.body;
  database
    .query(
      `INSERT INTO user_org (otheruserid, organid)
            VALUES ($1, $2)`,
      [userId, orgId]
    )
    .then(() => {
      console.log("user added");

      res.send({
        status: "success",
        message: "User added to organisation successfully",
      });
    })
    .catch((e) => {
      console.log("adding user failed");

      res.send({
        errors: [
          {
            field: "string",
            message: e.message,
          },
        ],
      });
    });
});
//     //database.end()



module.exports = app